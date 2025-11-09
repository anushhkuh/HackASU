from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import base64
from model import Body

app = Flask(__name__)
CORS(app)

body_estimation = Body()

@app.route("/pose", methods=["POST"])
def estimate_pose():
    try:
        data = request.json
        image_b64 = data.get("image")
        if not image_b64:
            return jsonify({"error": "No image data"}), 400

        img_data = base64.b64decode(image_b64.split(',')[1])
        np_arr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        keypoints, focus_status, posture_feedback = body_estimation(img)

        # Format keypoints for JSON
        keypoints_json = []
        for person in keypoints:
            person_kp = []
            for point in person:
                person_kp.append(list(point) if point else None)
            keypoints_json.append(person_kp)

        return jsonify({
            "poses": keypoints_json,
            "focus_status": focus_status,
            "posture_feedback": posture_feedback
        })
    except Exception as e:
        print("Backend error:", e)
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
