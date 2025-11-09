import React from 'react';
import './StreakDisplay.css';

const StreakDisplay = ({ streak, activityCalendar = {} }) => {
  const currentStreak = streak?.current || 0;
  const longestStreak = streak?.longest || 0;
  
  // Generate last 30 days for mini calendar
  const today = new Date();
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    days.push(date);
  }

  const getActivityLevel = (date) => {
    const dateKey = date.toISOString().split('T')[0];
    return activityCalendar[dateKey] || 0;
  };

  // Streak milestones (like LeetCode)
  const milestones = [
    { days: 7, label: 'Week', icon: '🔥' },
    { days: 30, label: 'Month', icon: '💪' },
    { days: 100, label: 'Century', icon: '🏆' },
    { days: 365, label: 'Year', icon: '👑' },
  ];

  const nextMilestone = milestones.find(m => currentStreak < m.days) || milestones[milestones.length - 1];
  const progressToNext = Math.min((currentStreak / nextMilestone.days) * 100, 100);

  return (
    <div className="streak-display">
      <div className="streak-header">
        <h3>🔥 Study Streak</h3>
        <div className="streak-badge">
          <span className="streak-number">{currentStreak}</span>
          <span className="streak-label">days</span>
        </div>
      </div>

      <div className="streak-content">
        {/* Current streak display (LeetCode style) */}
        <div className="streak-main">
          <div className="streak-fire-container">
            {Array.from({ length: Math.min(currentStreak, 10) }).map((_, i) => (
              <span key={i} className="streak-fire-emoji">🔥</span>
            ))}
            {currentStreak > 10 && (
              <span className="streak-plus">+{currentStreak - 10}</span>
            )}
          </div>
          <div className="streak-stats">
            <div className="streak-stat-item">
              <span className="streak-stat-label">Current</span>
              <span className="streak-stat-value">{currentStreak} days</span>
            </div>
            <div className="streak-stat-item">
              <span className="streak-stat-label">Longest</span>
              <span className="streak-stat-value">{longestStreak} days</span>
            </div>
          </div>
        </div>

        {/* Progress to next milestone */}
        <div className="streak-milestone">
          <div className="milestone-header">
            <span className="milestone-icon">{nextMilestone.icon}</span>
            <span className="milestone-text">
              {currentStreak >= nextMilestone.days 
                ? `🎉 ${nextMilestone.label} Streak Achieved!`
                : `${nextMilestone.days - currentStreak} days until ${nextMilestone.label} Streak`
              }
            </span>
          </div>
          <div className="milestone-progress">
            <div 
              className="milestone-progress-bar"
              style={{ width: `${progressToNext}%` }}
            />
          </div>
        </div>

        {/* Mini calendar hidden for compact design */}
      </div>
    </div>
  );
};

export default StreakDisplay;

