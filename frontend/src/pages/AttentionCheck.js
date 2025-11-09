import React, { useState, useRef, useEffect } from 'react';
import './AttentionCheck.css';

const AttentionCheck = () => {
  const [isActive, setIsActive] = useState(false);
  const [focusStatus, setFocusStatus] = useState('idle'); // idle, concentrated, distracted, writing notes
  const [postureFeedback, setPostureFeedback] = useState([]);
  const [backendStatus, setBackendStatus] = useState('disconnected'); // disconnected, connected, error
  const [checkCount, setCheckCount] = useState(0);
  const [lastCheckTime, setLastCheckTime] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const API_URL = 'http://localhost:5000/pose';

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      stopCamera();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          // Set canvas size to match video
          if (canvasRef.current && videoRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
          }
          setIsActive(true);
          setBackendStatus('connected');
          startPoseDetection();
        };
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Could not access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setIsActive(false);
    setBackendStatus('disconnected');
    setFocusStatus('idle');
    setPostureFeedback([]);
  };

  const sendFrameToBackend = async () => {
    if (!videoRef.current || !canvasRef.current) return null;

    try {
      // Create a temporary canvas to capture the frame
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = videoRef.current.videoWidth;
      tempCanvas.height = videoRef.current.videoHeight;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(videoRef.current, 0, 0);

      // Convert to base64
      const imageData = tempCanvas.toDataURL('image/jpeg', 0.8);

      // Send to backend
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData }),
      });

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error sending frame to backend:', error);
      setBackendStatus('error');
      return null;
    }
  };

  const drawPoses = (poses) => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    ctx.fillStyle = '#00FF00';

    poses.forEach(pose => {
      pose.forEach(point => {
        if (point && point.length >= 2) {
          ctx.beginPath();
          ctx.arc(point[0], point[1], 5, 0, 2 * Math.PI);
          ctx.fill();
        }
      });
    });
  };

  const startPoseDetection = async () => {
    const processFrame = async () => {
      if (!isActive) return;

      const data = await sendFrameToBackend();

      if (canvasRef.current && videoRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);

        if (data && data.poses && data.poses.length > 0) {
          drawPoses(data.poses);
          setFocusStatus(data.focus_status || 'Unknown');
          setPostureFeedback(data.posture_feedback || []);
          setBackendStatus('connected');
          setCheckCount(prev => prev + 1);
          setLastCheckTime(new Date());
        } else if (data) {
          setFocusStatus('NO PERSON DETECTED');
          setPostureFeedback([]);
        }
      }

      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    processFrame();
  };

  return (
    <div className="attention-check-page">
      <div className="attention-header">
        <h1>Attention Check</h1>
        <p className="subtitle">Monitor your focus during study sessions</p>
      </div>

      <div className="attention-content">
        <div className="attention-info-card">
          <h3>How It Works</h3>
          <ul>
            <li>📷 Real-time pose detection using MediaPipe</li>
            <li>🧠 AI-powered focus tracking (concentrated, distracted, taking notes)</li>
            <li>🧍 Posture analysis with feedback</li>
            <li>⚡ Live processing using Flask backend</li>
          </ul>
          <p className="privacy-note">
            ⚠️ Backend Required: Make sure the Flask server is running on port 5000.
            Run: <code>python server/backend/app.py</code>
          </p>
        </div>

        <div className="attention-controls">
          {!isActive ? (
            <button className="btn btn-primary btn-large" onClick={startCamera}>
              🎥 Start Attention Monitoring
            </button>
          ) : (
            <button className="btn btn-secondary btn-large" onClick={stopCamera}>
              ⏹ Stop Monitoring
            </button>
          )}
        </div>

        {isActive && (
          <div className="attention-monitor">
            <div className="video-container">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="attention-video"
                style={{ display: 'none' }}
              />
              <canvas
                ref={canvasRef}
                className="attention-video"
              />
              <div className="video-overlay">
                {backendStatus === 'error' && (
                  <div className="status-indicator distracted">
                    <span>❌ Backend Connection Error</span>
                  </div>
                )}
              </div>
            </div>

            <div className="attention-stats">
              <div className="stat-item">
                <span className="stat-label">Focus Status:</span>
                <span className={`stat-value ${
                  focusStatus.includes('CONCENTRATED') ? 'focused' :
                  focusStatus.includes('DISTRACTED') ? 'distracted' : ''
                }`}>
                  {focusStatus === 'idle' ? '⏸️ Idle' : focusStatus}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Backend:</span>
                <span className={`stat-value ${backendStatus === 'connected' ? 'focused' : 'distracted'}`}>
                  {backendStatus === 'connected' ? '✅ Connected' :
                   backendStatus === 'error' ? '❌ Error' : '⏹️ Disconnected'}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Frames Processed:</span>
                <span className="stat-value">{checkCount}</span>
              </div>
              {lastCheckTime && (
                <div className="stat-item">
                  <span className="stat-label">Last Update:</span>
                  <span className="stat-value">
                    {lastCheckTime.toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>

            {postureFeedback.length > 0 && (
              <div className="posture-feedback-section">
                <h3>⚠️ Posture Feedback:</h3>
                <ul>
                  {postureFeedback.map((feedback, index) => (
                    <li key={index}>{feedback}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {!isActive && (
          <div className="attention-placeholder">
            <div className="placeholder-icon">👁️</div>
            <p>Start monitoring to track your attention during study sessions</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttentionCheck;

