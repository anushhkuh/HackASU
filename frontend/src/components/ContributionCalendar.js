import React from 'react';
import './ContributionCalendar.css';

const ContributionCalendar = ({ activityData = {} }) => {
  // Generate last 365 days
  const today = new Date();
  const days = [];
  for (let i = 364; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    days.push(date);
  }

  // Get activity level for a date
  const getActivityLevel = (date) => {
    const dateKey = date.toISOString().split('T')[0];
    const count = activityData[dateKey] || 0;
    if (count === 0) return 0;
    if (count === 1) return 1;
    if (count <= 3) return 2;
    if (count <= 5) return 3;
    return 4;
  };

  // Group days by weeks (53 weeks for 365 days)
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  // Get month labels
  const monthLabels = [];
  let lastMonth = -1;
  days.forEach((day, index) => {
    if (day.getDate() === 1 || index === 0) {
      const month = day.toLocaleDateString('en-US', { month: 'short' });
      if (month !== lastMonth) {
        monthLabels.push({ month, index });
        lastMonth = month;
      }
    }
  });

  return (
    <div className="contribution-calendar">
      <div className="calendar-header">
        <h3>Study Activity</h3>
        <div className="calendar-legend">
          <span className="legend-label">Less</span>
          <div className="legend-squares">
            {[0, 1, 2, 3, 4].map(level => (
              <div
                key={level}
                className={`legend-square level-${level}`}
                title={`Level ${level} activity`}
              />
            ))}
          </div>
          <span className="legend-label">More</span>
        </div>
      </div>
      <div className="calendar-container">
        <div className="calendar-months">
          {monthLabels.map(({ month, index }) => (
            <div
              key={`${month}-${index}`}
              className="month-label"
              style={{ left: `${(index / 365) * 100}%` }}
            >
              {month}
            </div>
          ))}
        </div>
        <div className="calendar-grid">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="calendar-week">
              {week.map((day, dayIndex) => {
                const level = getActivityLevel(day);
                const dateKey = day.toISOString().split('T')[0];
                const count = activityData[dateKey] || 0;
                const isToday = dateKey === today.toISOString().split('T')[0];
                
                return (
                  <div
                    key={dateKey}
                      className={`calendar-day level-${level} ${isToday ? 'today' : ''}`}
                      title={`${day.toLocaleDateString()}: ${count} ${count === 1 ? 'activity' : 'activities'}`}
                    />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ContributionCalendar;

