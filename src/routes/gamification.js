import express from 'express';
import { prisma } from '../server.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Get user badges
router.get('/badges', authenticate, async (req, res, next) => {
  try {
    const userBadges = await prisma.userBadge.findMany({
      where: { userId: req.user.id },
      include: {
        badge: true,
      },
      orderBy: {
        earnedAt: 'desc',
      },
    });

    // Get all available badges
    const allBadges = await prisma.badge.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    // Mark which badges user has earned
    const earnedBadgeIds = new Set(userBadges.map(ub => ub.badgeId));
    const badges = allBadges.map(badge => ({
      ...badge,
      earned: earnedBadgeIds.has(badge.id),
      earnedAt: userBadges.find(ub => ub.badgeId === badge.id)?.earnedAt || null,
    }));

    res.json({
      badges,
      earnedCount: userBadges.length,
      totalCount: allBadges.length,
    });
  } catch (error) {
    next(error);
  }
});

// Get user streaks
router.get('/streaks', authenticate, async (req, res, next) => {
  try {
    const streaks = await prisma.streak.findMany({
      where: { userId: req.user.id },
      orderBy: {
        type: 'asc',
      },
    });

    res.json({ streaks });
  } catch (error) {
    next(error);
  }
});

// Get gamification dashboard data
router.get('/dashboard', authenticate, async (req, res, next) => {
  try {
    // Get badges
    const userBadges = await prisma.userBadge.findMany({
      where: { userId: req.user.id },
      include: { badge: true },
      orderBy: { earnedAt: 'desc' },
      take: 5, // Recent badges
    });

    // Get streaks
    const streaks = await prisma.streak.findMany({
      where: { userId: req.user.id },
    });

    // Get completion stats
    const completedAssignments = await prisma.assignment.count({
      where: {
        userId: req.user.id,
        status: 'completed',
      },
    });

    const totalSessions = await prisma.studySession.count({
      where: {
        userId: req.user.id,
        completed: true,
      },
    });

    const totalStudyMinutes = await prisma.studySession.aggregate({
      where: {
        userId: req.user.id,
        completed: true,
      },
      _sum: {
        duration: true,
      },
    });

    res.json({
      badges: userBadges.map(ub => ub.badge),
      streaks,
      stats: {
        completedAssignments,
        totalSessions,
        totalStudyMinutes: totalStudyMinutes._sum.duration || 0,
        totalStudyHours: Math.round((totalStudyMinutes._sum.duration || 0) / 60 * 10) / 10,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;

