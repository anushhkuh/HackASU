import React, { useState } from 'react';
import './TopBar.css';
import { authAPI } from '../utils/apiClient';
import apiClient from '../utils/apiClient';

const TopBar = ({ courses, selectedCourse, onCourseSelect, user, onLogout, onCanvasConnect }) => {
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [connectingCanvas, setConnectingCanvas] = useState(false);

  const handleQuickConnect = async () => {
    try {
      setConnectingCanvas(true);
      
      // Step 1: Connect Canvas
      const response = await authAPI.quickConnectCanvas();
      
      // Step 2: Sync assignments automatically
      try {
        await apiClient.post('/api/sync/assignments');
      } catch (syncError) {
        console.error('Sync error:', syncError);
        // Continue even if sync fails
      }
      
      // Step 3: Refresh data
      if (onCanvasConnect) {
        await onCanvasConnect();
      }
      
      alert(`Canvas connected successfully! Welcome ${response.canvasUserName || ''}\n\nAssignments are being synced...`);
    } catch (error) {
      console.error('Quick connect failed:', error);
      alert(error.message || 'Failed to connect Canvas. Make sure CANVAS_TEST_TOKEN is set in .env file.');
    } finally {
      setConnectingCanvas(false);
    }
  };

  const isCanvasConnected = user?.hasCanvasConnection;

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
                  {!isCanvasConnected ? (
                    <button 
                      className="connect-canvas-btn-small"
                      onClick={handleQuickConnect}
                      disabled={connectingCanvas}
                    >
                      {connectingCanvas ? 'Connecting...' : '⚡ Connect Canvas'}
                    </button>
                  ) : (
                    <small>Click "Sync" to load courses and assignments</small>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="topbar-right">
        {!isCanvasConnected && (
          <button 
            className="connect-canvas-btn-quick"
            onClick={handleQuickConnect}
            disabled={connectingCanvas}
            title="Connect Canvas using token from .env"
          >
            {connectingCanvas ? 'Connecting...' : '⚡ Connect Canvas'}
          </button>
        )}
        {user && (
          <div className="user-info">
            <span className="user-name">{user.name || user.email}</span>
            {isCanvasConnected && (
              <span className="canvas-status" title="Canvas Connected">✅</span>
            )}
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

