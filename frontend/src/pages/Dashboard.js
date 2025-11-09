import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import apiClient from '../utils/apiClient';

const Dashboard = ({ selectedCourse }) => {
  const [assignments, setAssignments] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, [selectedCourse]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [dashboardRes, assignmentsRes] = await Promise.all([
        apiClient.get('/api/dashboard'),
        apiClient.get('/api/assignments'),
      ]);
      
      setDashboardData(dashboardRes);
      let assignmentsList = assignmentsRes.assignments || [];
      
      if (selectedCourse) {
        assignmentsList = assignmentsList.filter(
          a => a.courseId === selectedCourse.id.toString()
        );
      }
      
      setAssignments(assignmentsList);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Study Dashboard</h1>
        <p className="dashboard-subtitle">Your personalized study overview</p>
      </div>

      {dashboardData && (
        <div className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-icon">📚</div>
            <div className="stat-content">
              <div className="stat-value">{dashboardData.stats?.totalAssignments || 0}</div>
              <div className="stat-label">Total Assignments</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <div className="stat-value">{dashboardData.stats?.completedAssignments || 0}</div>
              <div className="stat-label">Completed</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⏰</div>
            <div className="stat-content">
              <div className="stat-value">{dashboardData.studyTime?.today || 0}</div>
              <div className="stat-label">Minutes Today</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🔥</div>
            <div className="stat-content">
              <div className="stat-value">
                {dashboardData.streaks?.find(s => s.type === 'daily_study')?.current || 0}
              </div>
              <div className="stat-label">Day Streak</div>
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-sections">
        <section className="dashboard-section">
          <h2 className="section-title">Upcoming Assignments</h2>
          {dashboardData?.upcomingAssignments?.length > 0 ? (
            <div className="assignments-list">
              {dashboardData.upcomingAssignments.map((assignment) => (
                <div key={assignment.id} className="assignment-card">
                  <div className="assignment-header">
                    <h3>{assignment.title}</h3>
                    <span className="badge badge-info">
                      {assignment.courseName || 'General'}
                    </span>
                  </div>
                  <div className="assignment-details">
                    <span>📅 Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                    {assignment.expectedDuration && (
                      <span>⏱️ {Math.round(assignment.expectedDuration / 60)} hours</span>
                    )}
                  </div>
                  {assignment.chunks && assignment.chunks.length > 0 && (
                    <div className="chunks-progress">
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${(assignment.chunks.filter(c => c.status === 'completed').length / assignment.chunks.length) * 100}%`,
                          }}
                        />
                      </div>
                      <span>
                        {assignment.chunks.filter(c => c.status === 'completed').length} / {assignment.chunks.length} chunks
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-state">No upcoming assignments! 🎉</p>
          )}
        </section>

        {dashboardData?.overdueAssignments?.length > 0 && (
          <section className="dashboard-section">
            <h2 className="section-title warning">⚠️ Overdue Assignments</h2>
            <div className="assignments-list">
              {dashboardData.overdueAssignments.map((assignment) => (
                <div key={assignment.id} className="assignment-card overdue">
                  <div className="assignment-header">
                    <h3>{assignment.title}</h3>
                    <span className="badge badge-warning">Overdue</span>
                  </div>
                  <div className="assignment-details">
                    <span>📅 Was due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

