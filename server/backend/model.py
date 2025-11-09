import cv2
import mediapipe as mp
import numpy as np

class Body:
    def __init__(self, model_path=None):
        # Initialize MediaPipe Pose
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(static_image_mode=False, min_detection_confidence=0.5)
        self.mp_drawing = mp.solutions.drawing_utils
        print(f"Posture classifier initialized. Model path: {model_path}")

    # ------------------ Helper functions ------------------
    def calculate_midpoint(self, p1, p2):
        return ((p1[0]+p2[0])//2, (p1[1]+p2[1])//2)

    def calculate_angle(self, a, b, c):
        a = np.array(a)
        b = np.array(b)
        c = np.array(c)
        ba = a - b
        bc = c - b
        norm_ba = np.linalg.norm(ba)
        norm_bc = np.linalg.norm(bc)
        if norm_ba == 0 or norm_bc == 0:
            return 0
        cosine_angle = np.dot(ba, bc) / (norm_ba * norm_bc)
        return np.degrees(np.arccos(np.clip(cosine_angle, -1.0, 1.0)))

    # ------------------ Focus detection ------------------
    def detect_focus(self, landmarks, h):
        """
        Robust focus detection based on relative nose–eye positions.
        Works even if the webcam feed is mirrored or slightly tilted.
        """
        try:
            # Use reliable face landmarks
            # 0 - nose, 1 - left_eye_inner, 2 - left_eye, 3 - left_eye_outer,
            # 4 - right_eye_inner, 5 - right_eye, 6 - right_eye_outer,
            # 11 - left_shoulder, 12 - right_shoulder
            nose = landmarks[0]
            left_eye = landmarks[2]
            right_eye = landmarks[5]
            left_shoulder = landmarks[11]
            right_shoulder = landmarks[12]
        except IndexError:
            return "NO FACE DETECTED"

        # Mirror correction (if webcam feed is flipped horizontally)
        if left_eye[0] > right_eye[0]:
            left_eye, right_eye = right_eye, left_eye

        # --- Horizontal head rotation (turning left/right) ---
        eye_center_x = (left_eye[0] + right_eye[0]) / 2
        shoulder_center_x = (left_shoulder[0] + right_shoulder[0]) / 2
        shoulder_width = abs(right_shoulder[0] - left_shoulder[0])

        # Offset ratio normalized by shoulder width
        head_turn_ratio = (nose[0] - eye_center_x) / (shoulder_width if shoulder_width > 0 else 1)

        # --- Vertical head movement (looking down) ---
        eye_center_y = (left_eye[1] + right_eye[1]) / 2
        head_drop_ratio = (nose[1] - eye_center_y) / h

        # --- Decision thresholds (tuned) ---
        # These values are empirically stable across most cameras
        turn_threshold = 0.27   # how far sideways before “distracted”
        down_threshold = 0.07   # how far down before “writing notes”

        print(f"head_turn_ratio={head_turn_ratio:.2f}, head_drop_ratio={head_drop_ratio:.2f}")

        # --- Classify ---
        if abs(head_turn_ratio) < turn_threshold and head_drop_ratio < down_threshold:
            return "CONCENTRATED"
        elif head_drop_ratio >= down_threshold:
            return "WRITING NOTES / LOOKING DOWN"
        elif head_turn_ratio <= -turn_threshold:
            return "DISTRACTED (LEFT)"
        elif head_turn_ratio >= turn_threshold:
            return "DISTRACTED (RIGHT)"
        else:
            return "DISTRACTED"



    # ------------------ Posture analysis ------------------
    def analyze_posture(self, landmarks):
        feedback = []
        if len(landmarks) < 5:
            return feedback

        left_shoulder = landmarks[3]
        right_shoulder = landmarks[4]
        left_hip = landmarks[5] if len(landmarks) > 5 else None
        right_hip = landmarks[6] if len(landmarks) > 6 else None

        if left_hip and right_hip:
            hip_mid = self.calculate_midpoint(left_hip, right_hip)
            shoulder_mid = self.calculate_midpoint(left_shoulder, right_shoulder)
            vertical_ref = (hip_mid[0], hip_mid[1] - 100)
            body_angle = self.calculate_angle(vertical_ref, hip_mid, shoulder_mid)

            slouching_angle = self.calculate_angle(left_shoulder, right_shoulder, hip_mid)
            if slouching_angle > 10:
                feedback.append("Level your shoulders / Fix slouching")
            if body_angle > 10:
                feedback.append("Align body with vertical / Stand up straight")
        return feedback

    # ------------------ Main processing ------------------
    def __call__(self, image):
        h, w, _ = image.shape
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = self.pose.process(rgb)

        keypoints = []
        focus_status = "DISTRACTED"
        posture_feedback = []

        if results.pose_landmarks:
            landmarks = []
            for lm in results.pose_landmarks.landmark:
                landmarks.append((int(lm.x*w), int(lm.y*h)))
            keypoints.append(landmarks)

            if focus_status == "DISTRACTED" and len(posture_feedback) > 0:
                focus_status += " + BAD POSTURE"
            else:
                focus_status = self.detect_focus(landmarks, h)
            posture_feedback = self.analyze_posture(landmarks)

        return keypoints, focus_status, posture_feedback
