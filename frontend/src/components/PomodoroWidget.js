import React, { useState, useEffect, useCallback } from 'react';
import './PomodoroWidget.css';
import apiClient from '../utils/apiClient';

const PomodoroWidget = () => {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [sessionType, setSessionType] = useState('study');
  const [assignmentId, setAssignmentId] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const handleTimerComplete = useCallback(async () => {
    try {
      const audio = new Audio('/notification.mp3');
      audio.play().catch(() => {});
    } catch (e) {
      // Audio file not available
    }
    
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

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(isBreak ? 'Break Complete!' : 'Focus Session Complete!', {
        body: isBreak ? 'Time to get back to work!' : 'Great job! Take a break.',
        icon: '/logo192.png',
      });
    }

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
      setIsActive(false);
      handleTimerComplete();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, minutes, seconds, handleTimerComplete]);

  const toggleTimer = () => {
    if (!isActive && minutes === 0 && seconds === 0) {
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

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  if (isMinimized) {
    return (
      <div className="pomodoro-widget minimized" onClick={toggleMinimize}>
        <div className="minimized-timer">
          <div className="minimized-time">{formatTime(minutes, seconds)}</div>
          <div className="minimized-label">{isBreak ? 'Break' : 'Focus'}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pomodoro-widget">
      <div className="pomodoro-header">
        <h3>Pomodoro</h3>
        <button className="minimize-pomo-btn" onClick={toggleMinimize} title="Minimize">
          ➖
        </button>
      </div>
      
      <div className="pomodoro-timer-compact">
        <div className="timer-display-compact">
          <div className={`timer-time-compact ${isActive ? 'active' : ''}`}>
            {formatTime(minutes, seconds)}
          </div>
          <div className="timer-label-compact">
            {isBreak ? 'Break Time' : 'Focus Time'}
          </div>
        </div>
        <div className="progress-bar-compact">
          <div
            className="progress-fill-compact"
            style={{
              width: `${getProgress()}%`,
            }}
          />
        </div>
      </div>

      <div className="pomodoro-controls-compact">
        <button className="btn btn-primary btn-compact" onClick={toggleTimer}>
          {isActive ? '⏸' : '▶'}
        </button>
        <button className="btn btn-secondary btn-compact" onClick={resetTimer}>
          ↻
        </button>
      </div>

      {isBreak && (
        <div className="break-indicator-compact">
          <span>☕ Break Time</span>
        </div>
      )}
    </div>
  );
};

export default PomodoroWidget;
