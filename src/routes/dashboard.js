import express from 'express';
import { prisma } from '../server.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get dashboard data
router.get('/', authenticate, async (req, res, next) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // ALL upcoming assignments (no time limit - sorted by due date)
    const upcomingAssignments = await prisma.assignment.findMany({
      where: {
        userId: req.user.id,
        dueDate: {
          gte: today,
        },
        status: {
          not: 'completed',
        },
      },
      include: {
        chunks: {
          where: {
            status: {
              not: 'completed',
            },
          },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    // Overdue assignments
    const overdueAssignments = await prisma.assignment.findMany({
      where: {
        userId: req.user.id,
        dueDate: {
          lt: today,
        },
        status: {
          not: 'completed',
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
      take: 10,
    });

    // Recent study sessions (last 7 days)
    const recentSessions = await prisma.studySession.findMany({
      where: {
        userId: req.user.id,
        completed: true,
        startedAt: {
          gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
      take: 5,
    });

    // Today's study time
    const todaySessions = await prisma.studySession.aggregate({
      where: {
        userId: req.user.id,
        completed: true,
        startedAt: {
          gte: today,
        },
      },
      _sum: {
        duration: true,
      },
    });

    // This week's study time
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)

    const weekSessions = await prisma.studySession.aggregate({
      where: {
        userId: req.user.id,
        completed: true,
        startedAt: {
          gte: weekStart,
        },
      },
      _sum: {
        duration: true,
      },
    });

    // Pending reminders
    const pendingReminders = await prisma.reminder.findMany({
      where: {
        userId: req.user.id,
        sent: false,
        scheduledAt: {
          gte: today,
        },
      },
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        scheduledAt: 'asc',
      },
      take: 5,
    });

    // Streaks
    const streaks = await prisma.streak.findMany({
      where: { userId: req.user.id },
    });

    // All badges (earned and available)
    const userBadges = await prisma.userBadge.findMany({
      where: { userId: req.user.id },
      include: {
        badge: true,
      },
      orderBy: {
        earnedAt: 'desc',
      },
    });

    const allBadges = await prisma.badge.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    const earnedBadgeIds = new Set(userBadges.map(ub => ub.badgeId));
    const badges = allBadges.map(badge => ({
      ...badge,
      earned: earnedBadgeIds.has(badge.id),
      earnedAt: userBadges.find(ub => ub.badgeId === badge.id)?.earnedAt || null,
    }));

    // Completion stats
    const totalAssignments = await prisma.assignment.count({
      where: { userId: req.user.id },
    });

    const completedAssignments = await prisma.assignment.count({
      where: {
        userId: req.user.id,
        status: 'completed',
      },
    });

    // Debug logging
    console.log(`📊 Dashboard stats for user ${req.user.id}:`, {
      totalAssignments,
      completedAssignments,
      completionRate: totalAssignments > 0
        ? Math.round((completedAssignments / totalAssignments) * 100)
        : 0,
    });

    // Activity summary (last 30 days)
    const activitySummary = await prisma.activityLog.groupBy({
      by: ['action'],
      where: {
        userId: req.user.id,
        timestamp: {
          gte: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      _count: {
        id: true,
      },
    });

    // Activity calendar data (last 365 days for GitHub-style graph)
    const oneYearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000);
    const activityLogs = await prisma.activityLog.findMany({
      where: {
        userId: req.user.id,
        timestamp: {
          gte: oneYearAgo,
        },
        action: {
          in: ['session_completed', 'assignment_completed', 'note_created'],
        },
      },
      select: {
        timestamp: true,
        action: true,
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    // Group activity by date
    const activityByDate = {};
    activityLogs.forEach(log => {
      const dateKey = new Date(log.timestamp).toISOString().split('T')[0];
      if (!activityByDate[dateKey]) {
        activityByDate[dateKey] = 0;
      }
      activityByDate[dateKey]++;
    });

    res.json({
      upcomingAssignments,
      overdueAssignments,
      recentSessions,
      studyTime: {
        today: todaySessions._sum.duration || 0,
        thisWeek: weekSessions._sum.duration || 0,
      },
      pendingReminders,
      streaks,
      badges,
      earnedBadgesCount: userBadges.length,
      totalBadgesCount: allBadges.length,
      stats: {
        totalAssignments,
        completedAssignments,
        completionRate: totalAssignments > 0
          ? Math.round((completedAssignments / totalAssignments) * 100)
          : 0,
      },
      activitySummary,
      activityCalendar: activityByDate, // For GitHub-style contribution graph
    });
  } catch (error) {
    next(error);
  }
});

export default router;

