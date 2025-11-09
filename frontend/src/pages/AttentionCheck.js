import React, { useState, useRef, useEffect, useCallback } from 'react';
import './AttentionCheck.css';
import { Pose } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';

const AttentionCheck = () => {
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusStatus, setFocusStatus] = useState('INITIALIZING');
  const [postureFeedback, setPostureFeedback] = useState([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [distractionStartTime, setDistractionStartTime] = useState(null);
  const [showDistractionAlert, setShowDistractionAlert] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseRef = useRef(null);
  const cameraRef = useRef(null);
  const ctxRef = useRef(null);
  const distractionTimerRef = useRef(null);

  // MediaPipe Pose connections
  const POSE_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 7],
    [0, 4], [4, 5], [5, 6], [6, 8],
    [9, 10],
    [11, 12], [11, 13], [13, 15],
    [12, 14], [14, 16],
    [15, 17], [15, 19], [15, 21],
    [16, 18], [16, 20], [16, 22],
    [17, 19], [18, 20],
    [11, 23], [12, 24],
    [23, 24],
    [23, 25], [24, 26],
    [25, 27], [26, 28],
    [27, 29], [27, 31],
    [28, 30], [28, 32],
    [29, 31], [30, 32]
  ];

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      if (poseRef.current) {
        poseRef.current.close();
      }
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Exact focus detection from server/backend/model.py
  const detectFocus = useCallback((landmarks, h) => {
    try {
      const nose = landmarks[0];
      const left_shoulder = landmarks[11];
      const right_shoulder = landmarks[12];

      if (!nose || !left_shoulder || !right_shoulder) {
        return "NO PERSON DETECTED";
      }

      // Calculate shoulder center and width
      const shoulder_center_x = (left_shoulder.x + right_shoulder.x) / 2;
      const shoulder_width = Math.abs(right_shoulder.x - left_shoulder.x);

      // Horizontal head rotation (turning left/right)
      const head_turn_ratio = (nose.x - shoulder_center_x) / (shoulder_width || 1);

      // Vertical head movement (looking down)
      const shoulder_center_y = (left_shoulder.y + right_shoulder.y) / 2;
      const head_drop_ratio = (nose.y - shoulder_center_y) / h;

      // Decision thresholds from model.py
      const turn_threshold = 0.27;
      const down_threshold = 0.07;

      // Classify
      if (Math.abs(head_turn_ratio) < turn_threshold && head_drop_ratio < down_threshold) {
        return "FOCUSED";
      } else if (head_drop_ratio >= down_threshold) {
        return "TAKING NOTES";
      } else if (head_turn_ratio <= -turn_threshold) {
        return "DISTRACTED (LEFT)";
      } else if (head_turn_ratio >= turn_threshold) {
        return "DISTRACTED (RIGHT)";
      } else {
        return "DISTRACTED";
      }
    } catch (error) {
      console.error('Focus detection error:', error);
      return "ERROR";
    }
  }, []);

  // Posture analysis from model.py
  const analyzePosture = useCallback((landmarks) => {
    const feedback = [];
    try {
      if (landmarks.length < 13) return feedback;

      const left_shoulder = landmarks[11];
      const right_shoulder = landmarks[12];
      const left_hip = landmarks[23];
      const right_hip = landmarks[24];

      if (!left_shoulder || !right_shoulder || !left_hip || !right_hip) {
        return feedback;
      }

      const hip_mid = {
        x: (left_hip.x + right_hip.x) / 2,
        y: (left_hip.y + right_hip.y) / 2
      };
      const shoulder_mid = {
        x: (left_shoulder.x + right_shoulder.x) / 2,
        y: (left_shoulder.y + right_shoulder.y) / 2
      };

      const calculateAngle = (a, b, c) => {
        const ba = { x: a.x - b.x, y: a.y - b.y };
        const bc = { x: c.x - b.x, y: c.y - b.y };
        const dot = ba.x * bc.x + ba.y * bc.y;
        const magA = Math.sqrt(ba.x * ba.x + ba.y * ba.y);
        const magB = Math.sqrt(bc.x * bc.x + bc.y * bc.y);
        if (magA === 0 || magB === 0) return 0;
        const cosAngle = dot / (magA * magB);
        return Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
      };

      const vertical_ref = { x: hip_mid.x, y: hip_mid.y - 100 };
      const body_angle = calculateAngle(vertical_ref, hip_mid, shoulder_mid);
      const slouching_angle = calculateAngle(left_shoulder, right_shoulder, hip_mid);

      if (slouching_angle > 10) {
        feedback.push("Level your shoulders / Fix slouching");
      }
      if (body_angle > 10) {
        feedback.push("Align body with vertical / Stand up straight");
      }
    } catch (error) {
      console.error('Posture analysis error:', error);
    }
    return feedback;
  }, []);

  const showNotification = useCallback((title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/logo192.png',
      });
    }
  }, []);

  // Monitor distraction duration
  useEffect(() => {
    if (focusStatus.includes('DISTRACTED') && !focusStatus.includes('TAKING NOTES')) {
      if (!distractionStartTime) {
        setDistractionStartTime(Date.now());
      } else {
        const distractionDuration = (Date.now() - distractionStartTime) / 1000;
        if (distractionDuration >= 15 && !showDistractionAlert) {
          setShowDistractionAlert(true);
          showNotification('Attention Alert!', 'You have been distracted for 15 seconds. Please refocus on your work!');
          // Reset timer after notification
          setTimeout(() => {
            setDistractionStartTime(null);
            setShowDistractionAlert(false);
          }, 3000);
        }
      }
    } else {
      // Reset distraction timer when focused or taking notes
      setDistractionStartTime(null);
      setShowDistractionAlert(false);
    }
  }, [focusStatus, distractionStartTime, showDistractionAlert, showNotification]);

  const initializePose = useCallback(() => {
    try {
      console.log('Creating Pose instance...');
      const pose = new Pose({
        locateFile: (file) => {
          const url = `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
          console.log('Loading MediaPipe file:', file);
          return url;
        }
      });

      console.log('Setting pose options...');
      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      console.log('Setting up pose results handler...');
      poseRef.current = pose;
      console.log('Pose initialized successfully');
      return pose;
    } catch (error) {
      console.error('Error initializing pose:', error);
      alert('Error initializing pose detection. Please refresh the page.');
      throw error;
    }
  }, []);

  const onResults = useCallback((results) => {
    try {
      const canvasCtx = ctxRef.current;
      if (!canvasCtx || !canvasRef.current) {
        return;
      }

      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      // Draw video frame
      if (results.image) {
        canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);
      } else if (videoRef.current && videoRef.current.readyState >= 2) {
        canvasCtx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
      }

      if (results.poseLandmarks) {
        // Draw pose landmarks
        drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
          color: '#00FF00',
          lineWidth: 2
        });
        drawLandmarks(canvasCtx, results.poseLandmarks, {
          color: '#FF0000',
          lineWidth: 1,
          radius: 3
        });

        // Convert to pixel coordinates (matching Python model.py)
        const h = canvasRef.current.height;
        const w = canvasRef.current.width;
        const landmarks = results.poseLandmarks.map(lm => ({
          x: lm.x * w,
          y: lm.y * h
        }));

        // Analyze focus using exact logic from server/backend/model.py
        const focus = detectFocus(landmarks, h);
        const posture = analyzePosture(landmarks);
        
        setFocusStatus(focus);
        setPostureFeedback(posture);
      } else {
        setFocusStatus('NO PERSON DETECTED');
        setPostureFeedback([]);
      }

      canvasCtx.restore();
    } catch (error) {
      console.error('Error in onResults:', error);
    }
  }, [detectFocus, analyzePosture]);

  const startCamera = useCallback(async () => {
    try {
      console.log('Button clicked - Starting camera...');
      setIsLoading(true);
      setIsActive(true); // Set active first so canvas renders
      
      // Wait a bit for React to render the canvas
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (!videoRef.current || !canvasRef.current) {
        console.error('Video or canvas ref not available');
        alert('Error: Video or canvas element not found. Please refresh the page.');
        setIsLoading(false);
        setIsActive(false);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      ctxRef.current = canvas.getContext('2d');

      console.log('Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });
      
      console.log('Camera access granted');
      video.srcObject = stream;
      
      video.onloadedmetadata = async () => {
        console.log('Video metadata loaded');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        
        console.log('Initializing pose detection...');
        const pose = initializePose();
        
        // Set up the results handler
        pose.onResults(onResults);
        
        console.log('Setting up camera...');
        const camera = new Camera(video, {
          onFrame: async () => {
            try {
              await pose.send({ image: video });
            } catch (err) {
              console.error('Error sending frame to pose:', err);
            }
          },
          width: 640,
          height: 480
        });

        camera.start();
        cameraRef.current = camera;
        setIsLoading(false);
        setFocusStatus('INITIALIZING');
        console.log('Camera started successfully');
      };

      video.onerror = (err) => {
        console.error('Video error:', err);
        alert('Error loading video stream. Please try again.');
        setIsActive(false);
        setIsLoading(false);
      };
    } catch (error) {
      console.error('Error starting camera:', error);
      setIsLoading(false);
      setIsActive(false);
      let errorMessage = 'Could not access camera. ';
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Please allow camera permissions in your browser settings.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No camera found. Please connect a camera.';
      } else {
        errorMessage += error.message || 'Please check permissions.';
      }
      alert(errorMessage);
    }
  }, [initializePose, onResults]);

  const stopCamera = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    if (poseRef.current) {
      poseRef.current.close();
      poseRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (ctxRef.current && canvasRef.current) {
      ctxRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    if (distractionTimerRef.current) {
      clearTimeout(distractionTimerRef.current);
    }
    setIsActive(false);
    setFocusStatus('STOPPED');
    setPostureFeedback([]);
    setDistractionStartTime(null);
    setShowDistractionAlert(false);
  }, []);

  const getStatusColor = () => {
    if (focusStatus === 'FOCUSED') return '#4CAF50';
    if (focusStatus.includes('DISTRACTED')) return '#F44336';
    if (focusStatus === 'TAKING NOTES') return '#FF9800';
    return '#9E9E9E';
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  return (
    <div className="attention-check-page">
      <div className="attention-header">
        <h1>Attention Check</h1>
        <p className="subtitle">Real-time focus monitoring to help you stay on track</p>
      </div>

      <div className="attention-content">
        {/* Always render video and canvas elements (for refs) */}
        <video
          ref={videoRef}
          className="attention-video"
          style={{ display: 'none' }}
          autoPlay
          muted
          playsInline
        />
        
        {!isActive ? (
          <div className="attention-setup">
            <div className="attention-info-card">
              <h3>How It Works</h3>
              <ul>
                <li>📷 Uses your camera to detect your head position</li>
                <li>🧠 AI analyzes if you're focused, distracted, or taking notes</li>
                <li>⏰ Alerts you if you're distracted for 15+ seconds</li>
                <li>📊 Provides real-time feedback on your attention</li>
              </ul>
              <p className="privacy-note">
                ⚠️ Privacy: All processing happens locally in your browser. No video is stored or sent anywhere.
              </p>
            </div>

            <div className="attention-controls">
              <button 
                className="btn btn-primary btn-large" 
                onClick={startCamera}
                disabled={isLoading}
              >
                {isLoading ? '⏳ Starting...' : '🎥 Start Attention Monitoring'}
              </button>
            </div>
          </div>
        ) : (
          <div className={`attention-monitor-container ${isMinimized ? 'minimized' : ''}`}>
            <div className="monitor-header">
              <div className="status-display">
                <span className="status-dot" style={{ backgroundColor: getStatusColor() }}></span>
                <span className="status-text">{focusStatus}</span>
              </div>
              <button className="minimize-btn" onClick={toggleMinimize}>
                {isMinimized ? '⬜' : '➖'}
              </button>
            </div>

            <div className="video-wrapper">
              <canvas
                ref={canvasRef}
                className="attention-canvas"
                width={640}
                height={480}
              />
              
              {showDistractionAlert && (
                <div className="distraction-alert">
                  <div className="alert-content">
                    <span className="alert-icon">⚠️</span>
                    <div>
                      <div className="alert-title">You've been distracted for 15 seconds!</div>
                      <div className="alert-message">Please refocus on your work</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {!isMinimized && (
              <div className="attention-details">
                {postureFeedback.length > 0 && (
                  <div className="posture-section">
                    <h4>Posture Feedback:</h4>
                    <div className="posture-feedback">
                      {postureFeedback.map((feedback, idx) => (
                        <span key={idx} className="feedback-item">⚠️ {feedback}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="monitor-controls">
              <button className="btn btn-secondary" onClick={stopCamera}>
                ⏹ Stop Monitoring
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttentionCheck;
