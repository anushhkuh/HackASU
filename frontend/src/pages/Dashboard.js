import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import apiClient from '../utils/apiClient';
import ContributionCalendar from '../components/ContributionCalendar';

const Dashboard = ({ selectedCourse }) => {
  const [assignments, setAssignments] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showAllBadges, setShowAllBadges] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, [selectedCourse]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      
      // Fetch dashboard data (includes badges, streaks, etc.)
      const dashboardRes = await apiClient.get('/api/dashboard');
      setDashboardData(dashboardRes);
      
      // Try to fetch assignments directly from Canvas first
      let canvasAssignments = [];
      try {
        const canvasRes = await apiClient.get('/api/canvas/assignments');
        canvasAssignments = canvasRes.assignments || [];
        
        // Auto-sync Canvas assignments to database
        if (canvasAssignments.length > 0) {
          try {
            await apiClient.post('/api/sync/assignments');
          } catch (syncError) {
            console.warn('Auto-sync failed, but assignments will still display:', syncError);
          }
        }
      } catch (canvasError) {
        // If Canvas fetch fails, try database assignments
        console.log('Canvas not connected or fetch failed, using database assignments:', canvasError);
        try {
          const assignmentsRes = await apiClient.get('/api/assignments');
          canvasAssignments = assignmentsRes.assignments || [];
        } catch (dbError) {
          console.error('Failed to load assignments from database:', dbError);
        }
      }
      
      // Filter by selected course if needed
      let assignmentsList = canvasAssignments;
      if (selectedCourse) {
        assignmentsList = assignmentsList.filter(
          a => a.courseId === selectedCourse.id.toString() || 
               a.course_id === selectedCourse.id.toString()
        );
      }
      
      // Sort by due date
      assignmentsList.sort((a, b) => {
        const dateA = a.due_at ? new Date(a.due_at) : new Date('9999-12-31');
        const dateB = b.due_at ? new Date(b.due_at) : new Date('9999-12-31');
        return dateA - dateB;
      });
      
      setAssignments(assignmentsList);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      
      // First sync assignments to database
      const syncResult = await apiClient.post('/api/sync/assignments');
      
      // Then reload dashboard to show fresh assignments
      await loadDashboard();
      
      alert(`Sync complete! Synced: ${syncResult.synced || 0} new, Updated: ${syncResult.updated || 0} existing assignments.`);
    } catch (error) {
      console.error('Sync failed:', error);
      const errorMsg = error.message || 'Failed to sync assignments. Make sure Canvas is connected.';
      alert(errorMsg);
      
      // Still try to reload in case some assignments were synced
      await loadDashboard();
    } finally {
      setSyncing(false);
    }
  };

  const getDaysUntilDue = (dueDate) => {
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diff = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getUrgencyColor = (days) => {
    if (days === null) return 'var(--text-secondary)';
    if (days < 0) return '#ff4444';
    if (days <= 3) return '#ff8800';
    if (days <= 7) return '#ffaa00';
    return 'var(--text-primary)';
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  const studyStreak = dashboardData?.streaks?.find(s => s.type === 'daily_study');
  const earnedBadges = dashboardData?.badges?.filter(b => b.earned) || [];
  const unearnedBadges = dashboardData?.badges?.filter(b => !b.earned) || [];
  const displayedBadges = showAllBadges 
    ? [...earnedBadges, ...unearnedBadges]
    : earnedBadges.slice(0, 6);

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>🎮 Study Dashboard</h1>
          <p className="dashboard-subtitle">Your gamified study hub</p>
        </div>
        <button 
          className="sync-btn"
          onClick={handleSync}
          disabled={syncing}
          title="Sync assignments from Canvas"
        >
          {syncing ? '⏳ Syncing...' : '🔄 Sync Canvas'}
        </button>
      </div>

      {/* Gamified Stats Section */}
      {dashboardData && (
        <div className="gamified-stats">
          <div className="stat-card-gamified streak-card">
            <div className="stat-icon-large">🔥</div>
            <div className="stat-content-gamified">
              <div className="stat-value-large">{studyStreak?.current || 0}</div>
              <div className="stat-label">Day Streak</div>
              {studyStreak && (
                <div className="stat-subtext">
                  Longest: {studyStreak.longest} days
                </div>
              )}
            </div>
            <div className="streak-fire">
              {Array.from({ length: Math.min(studyStreak?.current || 0, 5) }).map((_, i) => (
                <span key={i} className="fire-emoji">🔥</span>
              ))}
            </div>
          </div>

          <div className="stat-card-gamified">
            <div className="stat-icon-large">🏆</div>
            <div className="stat-content-gamified">
              <div className="stat-value-large">
                {dashboardData.earnedBadgesCount || 0} / {dashboardData.totalBadgesCount || 0}
              </div>
              <div className="stat-label">Badges Earned</div>
              <div className="progress-bar-mini">
                <div
                  className="progress-fill-mini"
                  style={{
                    width: `${dashboardData.totalBadgesCount > 0 
                      ? (dashboardData.earnedBadgesCount / dashboardData.totalBadgesCount) * 100 
                      : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="stat-card-gamified">
            <div className="stat-icon-large">✅</div>
            <div className="stat-content-gamified">
              <div className="stat-value-large">{dashboardData.stats?.completionRate || 0}%</div>
              <div className="stat-label">Completion Rate</div>
              <div className="stat-subtext">
                {dashboardData.stats?.completedAssignments || 0} / {dashboardData.stats?.totalAssignments || 0} done
              </div>
            </div>
          </div>

          <div className="stat-card-gamified">
            <div className="stat-icon-large">⏰</div>
            <div className="stat-content-gamified">
              <div className="stat-value-large">{Math.round((dashboardData.studyTime?.today || 0) / 60)}</div>
              <div className="stat-label">Hours Today</div>
              <div className="stat-subtext">
                {dashboardData.studyTime?.thisWeek || 0} min this week
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Badges Showcase */}
      {dashboardData && dashboardData.badges && (
        <section className="dashboard-section badges-section">
          <div className="section-header">
            <h2 className="section-title">🏅 Achievements & Badges</h2>
            <button
              className="toggle-badges-btn"
              onClick={() => setShowAllBadges(!showAllBadges)}
            >
              {showAllBadges ? 'Show Earned Only' : `Show All (${dashboardData.totalBadgesCount || 0})`}
            </button>
          </div>
          <div className="badges-grid">
            {displayedBadges.length > 0 ? (
              displayedBadges.map((badge) => (
                <div
                  key={badge.id}
                  className={`badge-card ${badge.earned ? 'earned' : 'locked'}`}
                  title={badge.description || badge.name}
                >
                  <div className="badge-icon">
                    {badge.earned ? badge.icon || '🏆' : '🔒'}
                  </div>
                  <div className="badge-name">{badge.name}</div>
                  {badge.earned && badge.earnedAt && (
                    <div className="badge-date">
                      Earned {new Date(badge.earnedAt).toLocaleDateString()}
                    </div>
                  )}
                  {!badge.earned && (
                    <div className="badge-locked-text">Locked</div>
                  )}
                </div>
              ))
            ) : (
              <p className="empty-state">No badges yet. Start studying to earn achievements! 🎯</p>
            )}
          </div>
        </section>
      )}

      {/* GitHub-style Contribution Calendar */}
      {dashboardData?.activityCalendar && (
        <section className="dashboard-section">
          <h2 className="section-title">📊 Study Activity Calendar</h2>
          <ContributionCalendar activityData={dashboardData.activityCalendar} />
        </section>
      )}

      {/* All Assignments Section */}
      <section className="dashboard-section">
        <div className="section-header">
          <h2 className="section-title">📝 All Assignments</h2>
          <span className="assignments-count">
            {assignments.length || dashboardData?.upcomingAssignments?.length || 0} upcoming
            {dashboardData?.overdueAssignments?.length > 0 && (
              <span className="overdue-count">, {dashboardData.overdueAssignments.length} overdue</span>
            )}
          </span>
        </div>

        {/* Overdue Assignments */}
        {dashboardData?.overdueAssignments?.length > 0 && (
          <div className="assignments-list">
            {dashboardData.overdueAssignments.map((assignment) => (
              <div key={assignment.id} className="assignment-card overdue">
                <div className="assignment-header">
                  <h3>{assignment.title}</h3>
                  <span className="badge badge-warning">⚠️ Overdue</span>
                </div>
                <div className="assignment-details">
                  <span>📅 Was due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
                  {assignment.expectedDuration && (
                    <span>⏱️ {Math.round(assignment.expectedDuration / 60)} hours</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Display assignments from Canvas or database */}
        {assignments.length > 0 ? (
          <div className="assignments-list">
            {assignments.map((assignment) => {
              // Handle both Canvas API format and database format
              const assignmentTitle = assignment.name || assignment.title;
              const assignmentDueDate = assignment.due_at || assignment.dueDate;
              const courseName = assignment.courseName || assignment.course_name || 'General';
              const points = assignment.points_possible || assignment.expectedDuration;
              const assignmentId = assignment.id || assignment.canvasId;
              
              const daysUntil = getDaysUntilDue(assignmentDueDate);
              const urgencyColor = getUrgencyColor(daysUntil);
              
              return (
                <div key={assignmentId} className="assignment-card">
                  <div className="assignment-header">
                    <h3>{assignmentTitle}</h3>
                    <div className="assignment-badges">
                      <span className="badge badge-info">
                        {courseName}
                      </span>
                      {daysUntil !== null && (
                        <span 
                          className="badge badge-urgency"
                          style={{ backgroundColor: urgencyColor }}
                        >
                          {daysUntil < 0 
                            ? `${Math.abs(daysUntil)} days overdue`
                            : daysUntil === 0
                            ? 'Due today!'
                            : daysUntil === 1
                            ? 'Due tomorrow'
                            : `${daysUntil} days left`
                          }
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="assignment-details">
                    {assignmentDueDate && (
                      <span style={{ color: urgencyColor }}>
                        📅 Due: {new Date(assignmentDueDate).toLocaleDateString()}
                      </span>
                    )}
                    {points && (
                      <span>⏱️ {Math.round((points * 10) / 60)} hours (est.)</span>
                    )}
                    {assignment.points_possible && (
                      <span>📊 {assignment.points_possible} points</span>
                    )}
                  </div>
                  {assignment.description && (
                    <div className="assignment-description">
                      <p>{assignment.description.replace(/<[^>]*>/g, '').substring(0, 150)}...</p>
                    </div>
                  )}
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
                        {assignment.chunks.filter(c => c.status === 'completed').length} / {assignment.chunks.length} chunks completed
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : dashboardData?.upcomingAssignments?.length > 0 ? (
          <div className="assignments-list">
            {dashboardData.upcomingAssignments.map((assignment) => {
              const daysUntil = getDaysUntilDue(assignment.dueDate);
              const urgencyColor = getUrgencyColor(daysUntil);
              
              return (
                <div key={assignment.id} className="assignment-card">
                  <div className="assignment-header">
                    <h3>{assignment.title}</h3>
                    <div className="assignment-badges">
                      <span className="badge badge-info">
                        {assignment.courseName || 'General'}
                      </span>
                      {daysUntil !== null && (
                        <span 
                          className="badge badge-urgency"
                          style={{ backgroundColor: urgencyColor }}
                        >
                          {daysUntil < 0 
                            ? `${Math.abs(daysUntil)} days overdue`
                            : daysUntil === 0
                            ? 'Due today!'
                            : daysUntil === 1
                            ? 'Due tomorrow'
                            : `${daysUntil} days left`
                          }
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="assignment-details">
                    <span style={{ color: urgencyColor }}>
                      📅 Due: {new Date(assignment.dueDate).toLocaleDateString()}
                    </span>
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
                        {assignment.chunks.filter(c => c.status === 'completed').length} / {assignment.chunks.length} chunks completed
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="empty-state">
            No assignments found! 
            {!dashboardData?.streaks?.some(s => s.type === 'daily_study') && (
              <span><br />Connect Canvas and sync to see your assignments! 🔗</span>
            )}
          </p>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
