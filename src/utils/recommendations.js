import { prisma } from '../server.js';

/**
 * Generate personalized recommendations based on user activity
 * This is a rules-based system that can be enhanced with ML later
 */
export const getRecommendations = async (userId) => {
  const recommendations = [];

  try {
    // Get user's activity patterns
    const recentActivity = await prisma.activityLog.findMany({
      where: {
        userId,
        timestamp: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    // Get assignments
    const assignments = await prisma.assignment.findMany({
      where: {
        userId,
        status: {
          not: 'completed',
        },
        dueDate: {
          not: null,
        },
      },
      include: {
        chunks: true,
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    // Get study sessions
    const sessions = await prisma.studySession.findMany({
      where: {
        userId,
        completed: true,
        startedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
    });

    // Recommendation 1: Suggest study time based on patterns
    if (sessions.length > 0) {
      const avgDuration = sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length;
      const preferredTime = sessions.reduce((acc, s) => {
        const hour = new Date(s.startedAt).getHours();
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {});

      const bestHour = Object.keys(preferredTime).reduce((a, b) =>
        preferredTime[a] > preferredTime[b] ? a : b
      );

      recommendations.push({
        type: 'study_time',
        priority: 'medium',
        message: `Based on your patterns, you study best around ${bestHour}:00. Consider scheduling your next session then.`,
        suggestedDuration: Math.round(avgDuration),
      });
    }

    // Recommendation 2: Urgent assignments
    const urgentAssignments = assignments.filter(a => {
      if (!a.dueDate) return false;
      const daysUntilDue = (new Date(a.dueDate) - new Date()) / (1000 * 60 * 60 * 24);
      return daysUntilDue <= 2 && daysUntilDue > 0;
    });

    if (urgentAssignments.length > 0) {
      recommendations.push({
        type: 'urgent_assignment',
        priority: 'high',
        message: `You have ${urgentAssignments.length} assignment(s) due within 2 days. Consider starting them soon.`,
        assignments: urgentAssignments.map(a => ({
          id: a.id,
          title: a.title,
          dueDate: a.dueDate,
        })),
      });
    }

    // Recommendation 3: Chunk large assignments
    const largeAssignments = assignments.filter(a => {
      if (!a.expectedDuration) return false;
      const chunks = a.chunks || [];
      return a.expectedDuration > 120 && chunks.length === 0; // > 2 hours, no chunks
    });

    if (largeAssignments.length > 0) {
      recommendations.push({
        type: 'chunk_assignment',
        priority: 'medium',
        message: `Consider breaking down large assignments into smaller chunks for better focus.`,
        assignments: largeAssignments.map(a => ({
          id: a.id,
          title: a.title,
          expectedDuration: a.expectedDuration,
        })),
      });
    }

    // Recommendation 4: Study streak encouragement
    const streaks = await prisma.streak.findMany({
      where: { userId },
    });

    const studyStreak = streaks.find(s => s.type === 'daily_study');
    if (studyStreak && studyStreak.current > 0 && studyStreak.current < 7) {
      recommendations.push({
        type: 'streak_encouragement',
        priority: 'low',
        message: `You're on a ${studyStreak.current}-day study streak! Keep it up to reach 7 days!`,
        currentStreak: studyStreak.current,
      });
    }

    // Recommendation 5: Break suggestion
    const todaySessions = sessions.filter(s => {
      const sessionDate = new Date(s.startedAt);
      const today = new Date();
      return (
        sessionDate.getDate() === today.getDate() &&
        sessionDate.getMonth() === today.getMonth() &&
        sessionDate.getFullYear() === today.getFullYear()
      );
    });

      const todayMinutes = todaySessions.reduce((sum, s) => sum + s.duration, 0);
      if (todayMinutes > 180) {
        // More than 3 hours
        recommendations.push({
          type: 'take_break',
          priority: 'low',
          message: `You've studied for ${Math.round(todayMinutes / 60)} hours today. Consider taking a break!`,
        });
      }

    // Recommendation 6: Assignment completion patterns
    const delayedAssignments = assignments.filter(a => {
      if (!a.dueDate) return false;
      return new Date(a.dueDate) < new Date();
    });

    if (delayedAssignments.length > 0) {
      recommendations.push({
        type: 'overdue_warning',
        priority: 'high',
        message: `You have ${delayedAssignments.length} overdue assignment(s). Let's get back on track!`,
        assignments: delayedAssignments.map(a => ({
          id: a.id,
          title: a.title,
          dueDate: a.dueDate,
        })),
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return [];
  }
};

