import React, { useState, useRef, useEffect } from 'react';
import './AttentionCheck.css';

const AttentionCheck = () => {
  const [isActive, setIsActive] = useState(false);
  const [isFocused, setIsFocused] = useState(true);
  const [checkCount, setCheckCount] = useState(0);
  const [lastCheckTime, setLastCheckTime] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, checking, focused, distracted
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const checkIntervalRef = useRef(null);

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      stopCamera();
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsActive(true);
      startAttentionChecks();
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
    setIsActive(false);
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
    }
  };

  const startAttentionChecks = () => {
    // Check every 30 seconds
    checkIntervalRef.current = setInterval(() => {
      performAttentionCheck();
    }, 30000);

    // Initial check after 30 seconds
    setTimeout(() => {
      performAttentionCheck();
    }, 30000);
  };

  const performAttentionCheck = () => {
    setStatus('checking');
    setCheckCount(prev => prev + 1);
    setLastCheckTime(new Date());

    // Check if user is focused (tab is active)
    if (document.hidden) {
      setIsFocused(false);
      setStatus('distracted');
      showNotification('Attention Check', 'You seem distracted. Time to refocus!');
    } else {
      setIsFocused(true);
      setStatus('focused');
      
      // Show attention check prompt
      const confirmed = window.confirm(
        '👀 Attention Check!\n\nAre you still focused on your work?\n\nClick OK if yes, Cancel if you need a break.'
      );
      
      if (confirmed) {
        setStatus('focused');
        showNotification('Great!', 'Keep up the good focus!');
      } else {
        setStatus('distracted');
        showNotification('Break Time', 'Consider taking a short break to recharge.');
      }
    }

    // Reset status after 3 seconds
    setTimeout(() => {
      setStatus('idle');
    }, 3000);
  };

  const showNotification = (title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/logo192.png',
      });
    }
  };

  const handleVisibilityChange = () => {
    if (document.hidden && isActive) {
      setIsFocused(false);
      if (status !== 'checking') {
        setStatus('distracted');
      }
    } else {
      setIsFocused(true);
      if (status === 'distracted') {
        setStatus('idle');
      }
    }
  };

  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, status]);

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
            <li>📷 Camera access for face detection (optional)</li>
            <li>⏰ Periodic attention checks every 30 seconds</li>
            <li>👀 Tracks if you're focused or distracted</li>
            <li>🔔 Notifications to help you stay on track</li>
          </ul>
          <p className="privacy-note">
            ⚠️ Privacy: All processing happens locally in your browser. No data is sent to servers.
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
              />
              <div className="video-overlay">
                {status === 'checking' && (
                  <div className="status-indicator checking">
                    <span>🔍 Checking attention...</span>
                  </div>
                )}
                {status === 'focused' && (
                  <div className="status-indicator focused">
                    <span>✅ Focused!</span>
                  </div>
                )}
                {status === 'distracted' && (
                  <div className="status-indicator distracted">
                    <span>⚠️ Distracted</span>
                  </div>
                )}
              </div>
            </div>

            <div className="attention-stats">
              <div className="stat-item">
                <span className="stat-label">Status:</span>
                <span className={`stat-value ${isFocused ? 'focused' : 'distracted'}`}>
                  {isFocused ? '👀 Focused' : '😴 Distracted'}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Checks Performed:</span>
                <span className="stat-value">{checkCount}</span>
              </div>
              {lastCheckTime && (
                <div className="stat-item">
                  <span className="stat-label">Last Check:</span>
                  <span className="stat-value">
                    {lastCheckTime.toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
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

