import React, { useState, useEffect, useRef } from 'react';
import './Dashboard.css';
import apiClient from '../utils/apiClient';
import ContributionCalendar from '../components/ContributionCalendar';
import StreakDisplay from '../components/StreakDisplay';
import Recommendations from '../components/Recommendations';

// Hardcoded assignments for demo
const HARDCODED_ASSIGNMENTS = [
  {
    id: '1',
    title: 'Writing Project 1',
    courseName: 'English',
    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now (soonest)
    points: 100,
    description: 'Complete Writing Project 1 as assigned by your instructor.',
    status: 'pending'
  },
  {
    id: '2',
    title: 'Reflection for Writing Project',
    courseName: 'English',
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    points: 50,
    description: 'Write a reflection on your writing project experience and what you learned.',
    status: 'pending'
  },
  {
    id: '3',
    title: 'Group Presentation on Artificial Intelligence Ethics',
    courseName: 'English',
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    points: 150,
    description: 'Prepare a group presentation discussing ethical considerations in AI development and deployment.',
    status: 'pending'
  },
  {
    id: '4',
    title: 'Long Story Writing',
    courseName: 'English',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    points: 200,
    description: 'Write a creative long story (minimum 2000 words) on a topic of your choice.',
    status: 'pending'
  }
];

const Dashboard = ({ selectedCourse, onNavigateToPage }) => {
  const [assignments, setAssignments] = useState([]);
  const [assignmentsWithChunks, setAssignmentsWithChunks] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showAllBadges, setShowAllBadges] = useState(false);
  const assignmentsSectionRef = useRef(null);

  useEffect(() => {
    loadDashboard();
  }, [selectedCourse]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      
      // Format hardcoded assignments FIRST - ALWAYS include these
      const hardcodedFormatted = HARDCODED_ASSIGNMENTS.map(a => ({
        id: a.id,
        name: a.title,
        title: a.title,
        courseName: a.courseName,
        course_name: a.courseName,
        due_at: a.dueDate.toISOString(),
        dueDate: a.dueDate,
        points_possible: a.points,
        expectedDuration: a.points * 10,
        description: a.description,
        status: a.status
      }));
      
      // Start with hardcoded assignments (they always show)
      let allAssignments = [...hardcodedFormatted];
      
      // Try to fetch dashboard data (includes badges, streaks, etc.)
      try {
        const dashboardRes = await apiClient.get('/api/dashboard');
        setDashboardData(dashboardRes);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        // Continue even if dashboard data fails
      }
      
      // Try to fetch assignments directly from Canvas
      let canvasAssignments = [];
      let assignmentsWithChunks = [];
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
        // If Canvas fetch fails, that's OK - we have hardcoded assignments
        console.log('Canvas not connected or fetch failed:', canvasError);
      }
      
      // Fetch assignments with chunks from database
      try {
        const assignmentsRes = await apiClient.get('/api/assignments');
        const dbAssignments = assignmentsRes.assignments || [];
        // Filter assignments that have chunks
        assignmentsWithChunks = dbAssignments.filter(a => a.chunks && a.chunks.length > 0);
        // Sort assignments with chunks by due date (soonest first)
        assignmentsWithChunks.sort((a, b) => {
          const dateA = a.dueDate ? new Date(a.dueDate) : new Date('9999-12-31');
          const dateB = b.dueDate ? new Date(b.dueDate) : new Date('9999-12-31');
          return dateA - dateB;
        });
        // Also add to canvasAssignments if not already there
        if (canvasAssignments.length === 0) {
          canvasAssignments = dbAssignments;
        }
      } catch (dbError) {
        console.error('Failed to load assignments from database:', dbError);
        // Continue - we have hardcoded assignments
      }
      
      // Add Canvas/database assignments, avoiding duplicates
      const hardcodedTitles = new Set(hardcodedFormatted.map(a => a.title));
      canvasAssignments.forEach(assignment => {
        const title = assignment.name || assignment.title;
        if (title && !hardcodedTitles.has(title)) {
          allAssignments.push(assignment);
        }
      });
      
      // Filter by selected course if needed
      let assignmentsList = allAssignments;
      if (selectedCourse) {
        assignmentsList = assignmentsList.filter(
          a => a.courseId === selectedCourse.id.toString() || 
               a.course_id === selectedCourse.id.toString() ||
               a.courseName === selectedCourse.name
        );
      }
      
      // Sort by due date (soonest first)
      assignmentsList.sort((a, b) => {
        const dateA = a.due_at ? new Date(a.due_at) : (a.dueDate ? new Date(a.dueDate) : new Date('9999-12-31'));
        const dateB = b.due_at ? new Date(b.due_at) : (b.dueDate ? new Date(b.dueDate) : new Date('9999-12-31'));
        return dateA - dateB; // Ascending order (soonest first)
      });
      
      console.log('✅ Assignments to display:', assignmentsList.length, assignmentsList);
      setAssignments(assignmentsList);
      
      // Store assignments with chunks separately
      setAssignmentsWithChunks(assignmentsWithChunks);
    } catch (error) {
      console.error('❌ Failed to load dashboard:', error);
      // Even on error, set hardcoded assignments
      const hardcodedFormatted = HARDCODED_ASSIGNMENTS.map(a => ({
        id: a.id,
        name: a.title,
        title: a.title,
        courseName: a.courseName,
        course_name: a.courseName,
        due_at: a.dueDate.toISOString(),
        dueDate: a.dueDate,
        points_possible: a.points,
        expectedDuration: a.points * 10,
        description: a.description,
        status: a.status
      }));
      hardcodedFormatted.sort((a, b) => {
        const dateA = new Date(a.dueDate);
        const dateB = new Date(b.dueDate);
        return dateA - dateB;
      });
      console.log('✅ Setting hardcoded assignments as fallback:', hardcodedFormatted.length);
      setAssignments(hardcodedFormatted);
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

      {/* Smart Recommendations */}
      <Recommendations 
        onNavigateToChunking={() => onNavigateToPage && onNavigateToPage('chunking')}
        onNavigateToAssignments={() => {
          if (assignmentsSectionRef.current) {
            assignmentsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }}
      />

      {/* LeetCode/GitHub Style Streak Display */}
      <StreakDisplay 
        streak={studyStreak || { current: 0, longest: 0 }} 
        activityCalendar={dashboardData?.activityCalendar || {}}
      />

      {/* Gamified Stats Section */}
      {dashboardData && (
        <div className="gamified-stats">

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
            <section className="dashboard-section" ref={assignmentsSectionRef}>
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

        {/* Display ALL assignments (hardcoded + Canvas/database) */}
        {assignments.length > 0 && (
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
        )}
        
        {assignments.length === 0 && (
          <p className="empty-state">
            No assignments found! 
            {!dashboardData?.streaks?.some(s => s.type === 'daily_study') && (
              <span><br />Connect Canvas and sync to see your assignments! 🔗</span>
            )}
          </p>
        )}

        {/* Assignments with Chunks Section */}
        {assignmentsWithChunks.length > 0 && (
          <div style={{ marginTop: 'var(--spacing-xl)' }}>
            <h3 className="section-title" style={{ fontSize: '1.25rem', marginBottom: 'var(--spacing-md)' }}>
              ✂️ Chunked Assignments
            </h3>
            <div className="assignments-list">
              {assignmentsWithChunks.map((assignment) => {
                const assignmentTitle = assignment.name || assignment.title;
                const assignmentDueDate = assignment.due_at || assignment.dueDate;
                const courseName = assignment.courseName || assignment.course_name || 'General';
                const assignmentId = assignment.id || assignment.canvasId;
                const daysUntil = getDaysUntilDue(assignmentDueDate);
                const urgencyColor = getUrgencyColor(daysUntil);
                const completedChunks = assignment.chunks?.filter(c => c.status === 'completed').length || 0;
                const totalChunks = assignment.chunks?.length || 0;
                const chunkProgress = totalChunks > 0 ? (completedChunks / totalChunks) * 100 : 0;
                
                return (
                  <div key={assignmentId} className="assignment-card">
                    <div className="assignment-header">
                      <h3>{assignmentTitle}</h3>
                      <div className="assignment-badges">
                        <span className="badge badge-info">
                          {courseName}
                        </span>
                        <span className="badge badge-info" style={{ backgroundColor: 'var(--primary-orange)' }}>
                          ✂️ {totalChunks} chunks
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
                    </div>
                    {assignment.chunks && assignment.chunks.length > 0 && (
                      <div className="chunks-progress">
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${chunkProgress}%`,
                            }}
                          />
                        </div>
                        <span>
                          {completedChunks} / {totalChunks} chunks completed ({Math.round(chunkProgress)}%)
                        </span>
                      </div>
                    )}
                    {assignment.chunks && assignment.chunks.length > 0 && (
                      <div className="chunks-list-preview">
                        <div className="chunks-preview-header">Chunks:</div>
                        <div className="chunks-preview-grid">
                          {assignment.chunks.slice(0, 4).map((chunk, idx) => (
                            <div 
                              key={chunk.id || idx} 
                              className={`chunk-preview-item ${chunk.status === 'completed' ? 'completed' : ''}`}
                            >
                              <span className="chunk-preview-number">{chunk.order || idx + 1}</span>
                              <span className="chunk-preview-title">{chunk.title}</span>
                              <span className="chunk-preview-status">
                                {chunk.status === 'completed' ? '✅' : chunk.status === 'in_progress' ? '🔄' : '⏳'}
                              </span>
                            </div>
                          ))}
                          {assignment.chunks.length > 4 && (
                            <div className="chunk-preview-more">
                              +{assignment.chunks.length - 4} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
