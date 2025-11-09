import React, { useState, useEffect, useCallback } from 'react';
import './PomodoroWidget.css';
import apiClient from '../utils/apiClient';

const PomodoroWidget = () => {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [sessionType, setSessionType] = useState('study'); // study, homework, pomodoro
  const [assignmentId, setAssignmentId] = useState(null);

  const handleTimerComplete = useCallback(async () => {
    // Play completion sound (optional - file may not exist)
    try {
      const audio = new Audio('/notification.mp3');
      audio.play().catch(() => {}); // Ignore if audio fails
    } catch (e) {
      // Audio file not available, continue without sound
    }
    
    // Save session to backend
    try {
      await apiClient.post('/api/sessions', {
        type: sessionType,
        duration: isBreak ? 5 : 25,
        assignmentId: assignmentId,
        completed: true,
      });
    } catch (error) {
      console.error('Failed to save session:', error);
    }

    // Show notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(isBreak ? 'Break Complete!' : 'Focus Session Complete!', {
        body: isBreak ? 'Time to get back to work!' : 'Great job! Take a break.',
        icon: '/logo192.png',
      });
    }

    // Switch to break or reset
    if (!isBreak) {
      setIsBreak(true);
      setMinutes(5);
      setSeconds(0);
    } else {
      setIsBreak(false);
      setMinutes(25);
      setSeconds(0);
    }
  }, [isBreak, sessionType, assignmentId]);

  useEffect(() => {
    let interval = null;
    if (isActive && (minutes > 0 || seconds > 0)) {
      interval = setInterval(() => {
        setSeconds((prevSeconds) => {
          if (prevSeconds > 0) {
            return prevSeconds - 1;
          } else {
            setMinutes((prevMinutes) => {
              if (prevMinutes > 0) {
                return prevMinutes - 1;
              } else {
                return 0;
              }
            });
            return 59;
          }
        });
      }, 1000);
    } else if (isActive && minutes === 0 && seconds === 0) {
      // Timer completed
      setIsActive(false);
      handleTimerComplete();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, minutes, seconds, handleTimerComplete]);

  const toggleTimer = () => {
    if (!isActive && minutes === 0 && seconds === 0) {
      // Reset if timer is at 0
      setMinutes(isBreak ? 5 : 25);
      setSeconds(0);
    }
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    setMinutes(isBreak ? 5 : 25);
    setSeconds(0);
  };

  const formatTime = (mins, secs) => {
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getProgress = () => {
    const total = isBreak ? 5 * 60 : 25 * 60;
    const current = minutes * 60 + seconds;
    return ((total - current) / total) * 100;
  };

  return (
    <div className="pomodoro-widget">
      <div className="pomodoro-header">
        <h3>Pomodoro Timer</h3>
        <div className="session-type-selector">
          <button
            className={`type-btn ${sessionType === 'study' ? 'active' : ''}`}
            onClick={() => setSessionType('study')}
          >
            Study
          </button>
          <button
            className={`type-btn ${sessionType === 'homework' ? 'active' : ''}`}
            onClick={() => setSessionType('homework')}
          >
            Homework
          </button>
        </div>
      </div>
      
      <div className="pomodoro-timer">
        <div className="timer-circle">
          <svg className="timer-svg" viewBox="0 0 200 200">
            <circle
              className="timer-bg"
              cx="100"
              cy="100"
              r="90"
            />
            <circle
              className="timer-progress"
              cx="100"
              cy="100"
              r="90"
              style={{
                strokeDasharray: `${2 * Math.PI * 90}`,
                strokeDashoffset: `${2 * Math.PI * 90 * (1 - getProgress() / 100)}`,
              }}
            />
          </svg>
          <div className="timer-display">
            <div className={`timer-time ${isActive ? 'active' : ''}`}>
              {formatTime(minutes, seconds)}
            </div>
            <div className="timer-label">
              {isBreak ? 'Break Time' : 'Focus Time'}
            </div>
          </div>
        </div>
      </div>

      <div className="pomodoro-controls">
        <button className="btn btn-primary" onClick={toggleTimer}>
          {isActive ? '⏸ Pause' : '▶ Start'}
        </button>
        <button className="btn btn-secondary" onClick={resetTimer}>
          ↻ Reset
        </button>
      </div>

      {isBreak && (
        <div className="break-indicator">
          <span>☕ Take a well-deserved break!</span>
        </div>
      )}
    </div>
  );
};

export default PomodoroWidget;
