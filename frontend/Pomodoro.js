import React, { useState, useEffect, useRef } from 'react';
import './Pomodoro.css';

const WORK_MINUTES = 25;
const BREAK_MINUTES = 5;

// Default position for the widget
const getDefaultPosition = () => ({
  x: window.innerWidth - 280, // widget width is 240px + some margin
  y: 100 // Some distance from top
});

function PomodoroTimer() {
  // Initialize position from right side of screen
  const [position, setPosition] = useState(getDefaultPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  const timerRef = useRef(null);
  const [minutes, setMinutes] = useState(WORK_MINUTES);
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState('work'); // 'work' or 'break'
  // user-set custom timer values
  const [customMinutes, setCustomMinutes] = useState(WORK_MINUTES);
  const [customSeconds, setCustomSeconds] = useState(0);

  useEffect(() => {
    let timer = null;
    if (isRunning) {
      timer = setInterval(() => {
        if (seconds > 0) setSeconds(seconds - 1);
        else if (minutes > 0) {
          setMinutes(minutes - 1);
          setSeconds(59);
        } else {
          // Switch mode on timer end
          if (mode === 'work') {
            setMode('break');
            setMinutes(BREAK_MINUTES);
          } else {
            setMode('work');
            setMinutes(WORK_MINUTES);
          }
          setSeconds(0);
          setIsRunning(false);
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRunning, seconds, minutes, mode]);

  const startTimer = () => setIsRunning(true);
  const stopTimer = () => setIsRunning(false);
  const resetTimer = () => {
    if (mode === 'work') setMinutes(WORK_MINUTES);
    else if (mode === 'break') setMinutes(BREAK_MINUTES);
    else if (mode === 'custom') setMinutes(customMinutes || 0);
    setSeconds(0);
    setIsRunning(false);
  };

  const setCustomTimer = () => {
    const m = parseInt(customMinutes, 10) || 0;
    const s = parseInt(customSeconds, 10) || 0;
    // normalize seconds into minutes
    const extraM = Math.floor(s / 60);
    const remS = s % 60;
    setMinutes(m + extraM);
    setSeconds(remS);
    setMode('custom');
    setIsRunning(false);
  };

  // Drag handlers
  const handleMouseDown = (e) => {
    if (e.target.closest('.timer-controls')) return; // Don't drag when clicking controls
    setIsDragging(true);
    const rect = timerRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    // Keep within viewport bounds
    const maxX = window.innerWidth - timerRef.current.offsetWidth;
    const maxY = window.innerHeight - timerRef.current.offsetHeight;
    
    setPosition({
      x: Math.max(0, Math.min(maxX, newX)),
      y: Math.max(0, Math.min(maxY, newY))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    console.log('Pomodoro mounted at position:', position);
    
    if (isDragging) {
      const handleMouseMoveEvent = (e) => {
        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;
        
        // Keep within viewport bounds
        const maxX = window.innerWidth - (timerRef.current?.offsetWidth || 240);
        const maxY = window.innerHeight - (timerRef.current?.offsetHeight || 100);
        
        setPosition({
          x: Math.max(0, Math.min(maxX, newX)),
          y: Math.max(0, Math.min(maxY, newY))
        });
      };

      window.addEventListener('mousemove', handleMouseMoveEvent);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMoveEvent);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  return (
    <div 
      ref={timerRef}
      className={`pomodoro-widget ${isDragging ? 'dragging' : ''} ${isMinimized ? 'minimized' : ''}`}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="widget-header" onMouseDown={handleMouseDown}>
        <div className="title">
          {mode === 'work' ? 'Work Session' : mode === 'break' ? 'Break Time' : 'Custom Timer'}
        </div>
        <div className="widget-controls">
          <button 
            className="widget-btn" 
            title="Reset Position"
            onClick={(e) => {
              e.stopPropagation(); // Prevent drag start
              setPosition(getDefaultPosition());
            }}
          >
            ↺
          </button>
          <button 
            className="widget-btn" 
            title={isMinimized ? "Maximize" : "Minimize"}
            onClick={(e) => {
              e.stopPropagation(); // Prevent drag start
              setIsMinimized(!isMinimized);
            }}
          >
            {isMinimized ? '□' : '−'}
          </button>
        </div>
      </div>
      
      <div className="widget-content">
        <div className="time-display">
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>

        <div className="timer-controls">
          <button onClick={startTimer} disabled={isRunning}>Start</button>
          <button onClick={stopTimer}>Stop</button>
          <button onClick={resetTimer}>Reset</button>
        </div>

        {!isMinimized && (
          <div className="set-timer">
            <label>Set timer:</label>
            <input
              type="number"
              min="0"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
            />
            <span>min</span>
            <input
              type="number"
              min="0"
              value={customSeconds}
              onChange={(e) => setCustomSeconds(e.target.value)}
            />
            <span>sec</span>
            <button onClick={setCustomTimer}>Set</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PomodoroTimer;