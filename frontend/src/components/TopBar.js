import React, { useState } from 'react';
import './TopBar.css';

const TopBar = ({ courses, selectedCourse, onCourseSelect, user, onLogout }) => {
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="course-selector">
          <button
            className="course-selector-btn"
            onClick={() => setShowCourseDropdown(!showCourseDropdown)}
            aria-label="Select course"
          >
            <span className="course-icon">📖</span>
            <span className="course-text">
              {selectedCourse ? selectedCourse.name : 'Select Course'}
            </span>
            <span className="dropdown-arrow">▼</span>
          </button>
          {showCourseDropdown && (
            <div className="course-dropdown">
              <button
                className="course-option"
                onClick={() => {
                  onCourseSelect(null);
                  setShowCourseDropdown(false);
                }}
              >
                All Courses
              </button>
              {courses.map((course) => (
                <button
                  key={course.id}
                  className={`course-option ${selectedCourse?.id === course.id ? 'active' : ''}`}
                  onClick={() => {
                    onCourseSelect(course);
                    setShowCourseDropdown(false);
                  }}
                >
                  {course.name}
                </button>
              ))}
              {courses.length === 0 && (
                <div className="course-empty">
                  <p>No courses available</p>
                  <small>Connect Canvas to see your courses</small>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="topbar-right">
        {user && (
          <div className="user-info">
            <span className="user-name">{user.name || user.email}</span>
            <button className="logout-btn" onClick={onLogout} aria-label="Logout">
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default TopBar;

