import React, { useState, useEffect } from 'react';
import './Recommendations.css';
import apiClient from '../utils/apiClient';

const Recommendations = ({ onNavigateToChunking, onNavigateToAssignments }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRec, setExpandedRec] = useState(null);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/recommendations');
      setRecommendations(response.recommendations || []);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high':
        return '🔴';
      case 'medium':
        return '🟡';
      case 'low':
        return '🟢';
      default:
        return '💡';
    }
  };

  const getRecommendationIcon = (type) => {
    switch (type) {
      case 'study_time':
        return '⏰';
      case 'urgent_assignment':
        return '⚡';
      case 'chunk_assignment':
        return '✂️';
      case 'streak_encouragement':
        return '🔥';
      case 'take_break':
        return '☕';
      case 'overdue_warning':
        return '⚠️';
      default:
        return '💡';
    }
  };

  const handleRecommendationClick = (rec) => {
    if (rec.type === 'chunk_assignment' && rec.assignments && rec.assignments.length > 0) {
      // Navigate to chunking page
      if (onNavigateToChunking) {
        onNavigateToChunking();
      }
    } else if ((rec.type === 'urgent_assignment' || rec.type === 'overdue_warning') && rec.assignments) {
      // Scroll to assignments section
      if (onNavigateToAssignments) {
        onNavigateToAssignments();
      }
    }
    // Toggle expansion for details
    setExpandedRec(expandedRec === rec.type ? null : rec.type);
  };

  if (loading) {
    return (
      <div className="recommendations-section">
        <div className="recommendations-loading">
          <div className="spinner-small"></div>
          <span>Loading recommendations...</span>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="recommendations-section">
        <h2 className="section-title">💡 Smart Recommendations</h2>
        <div className="recommendations-empty">
          <p>No recommendations at the moment. Keep studying to get personalized tips! 🎯</p>
        </div>
      </div>
    );
  }

  return (
    <div className="recommendations-section">
      <div className="recommendations-header">
        <h2 className="section-title">💡 Smart Recommendations</h2>
        <button 
          className="refresh-recommendations-btn"
          onClick={loadRecommendations}
          title="Refresh recommendations"
        >
          🔄
        </button>
      </div>
      <div className="recommendations-list">
        {recommendations.map((rec, index) => (
          <div
            key={index}
            className={`recommendation-card priority-${rec.priority}`}
            onClick={() => handleRecommendationClick(rec)}
          >
            <div className="recommendation-header">
              <div className="recommendation-icon-priority">
                <span className="recommendation-icon">{getRecommendationIcon(rec.type)}</span>
                <span className="priority-badge">{getPriorityIcon(rec.priority)}</span>
              </div>
              <div className="recommendation-content">
                <p className="recommendation-message">{rec.message}</p>
                {rec.suggestedDuration && (
                  <span className="recommendation-detail">
                    Suggested duration: {Math.round(rec.suggestedDuration / 60)} minutes
                  </span>
                )}
                {rec.currentStreak && (
                  <span className="recommendation-detail">
                    Current streak: {rec.currentStreak} days
                  </span>
                )}
              </div>
            </div>
            
            {rec.assignments && rec.assignments.length > 0 && (
              <div className={`recommendation-assignments ${expandedRec === rec.type ? 'expanded' : ''}`}>
                <div className="assignments-toggle">
                  <span>
                    {expandedRec === rec.type ? '▼' : '▶'} {rec.assignments.length} assignment(s)
                  </span>
                </div>
                {expandedRec === rec.type && (
                  <div className="assignments-list-mini">
                    {rec.assignments.map((assignment) => (
                      <div key={assignment.id} className="assignment-mini">
                        <span className="assignment-title-mini">{assignment.title}</span>
                        {assignment.dueDate && (
                          <span className="assignment-due-mini">
                            Due: {new Date(assignment.dueDate).toLocaleDateString()}
                          </span>
                        )}
                        {assignment.expectedDuration && (
                          <span className="assignment-duration-mini">
                            ~{Math.round(assignment.expectedDuration / 60)} hours
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {rec.type === 'chunk_assignment' && rec.assignments && rec.assignments.length > 0 && (
              <div className="recommendation-action">
                <button 
                  className="action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onNavigateToChunking) {
                      onNavigateToChunking();
                    }
                  }}
                >
                  ✂️ Chunk Assignments
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Recommendations;

