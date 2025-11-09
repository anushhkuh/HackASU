import express from 'express';
import { prisma } from '../server.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get dashboard data
router.get('/', authenticate, async (req, res, next) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Upcoming assignments (next 7 days)
    const upcomingAssignments = await prisma.assignment.findMany({
      where: {
        userId: req.user.id,
        dueDate: {
          gte: today,
          lte: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
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
      take: 10,
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

    // Recent badges
    const recentBadges = await prisma.userBadge.findMany({
      where: { userId: req.user.id },
      include: {
        badge: true,
      },
      orderBy: {
        earnedAt: 'desc',
      },
      take: 3,
    });

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
      recentBadges: recentBadges.map(ub => ub.badge),
      stats: {
        totalAssignments,
        completedAssignments,
        completionRate: totalAssignments > 0
          ? Math.round((completedAssignments / totalAssignments) * 100)
          : 0,
      },
      activitySummary,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

