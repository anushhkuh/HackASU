import express from 'express';
import { prisma } from '../server.js';
import { authenticate } from '../middleware/auth.js';
import { logActivity } from '../utils/activityLogger.js';
import { updateStreaks, checkBadges } from '../utils/gamification.js';

const router = express.Router();

// Get all study sessions
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { assignmentId, type, completed, limit = 50 } = req.query;

    const where = {
      userId: req.user.id,
      ...(assignmentId && { assignmentId }),
      ...(type && { type }),
      ...(completed !== undefined && { completed: completed === 'true' }),
    };

    const sessions = await prisma.studySession.findMany({
      where,
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
            courseName: true,
          },
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
      take: parseInt(limit),
    });

    res.json({ sessions });
  } catch (error) {
    next(error);
  }
});

// Get single session
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const session = await prisma.studySession.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
      include: {
        assignment: true,
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ session });
  } catch (error) {
    next(error);
  }
});

// Start study session (Pomodoro or general)
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { type, duration, assignmentId, breakDuration } = req.body;

    if (!type || !duration) {
      return res.status(400).json({ error: 'Type and duration are required' });
    }

    // Validate assignment if provided
    if (assignmentId) {
      const assignment = await prisma.assignment.findFirst({
        where: {
          id: assignmentId,
          userId: req.user.id,
        },
      });

      if (!assignment) {
        return res.status(404).json({ error: 'Assignment not found' });
      }
    }

    const session = await prisma.studySession.create({
      data: {
        userId: req.user.id,
        type: type || 'study',
        duration,
        assignmentId: assignmentId || null,
        breakDuration: breakDuration || null,
        completed: false,
      },
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    await logActivity(req.user.id, 'session_started', 'session', session.id, {
      type,
      duration,
      assignmentId,
    });

    res.status(201).json({ session });
  } catch (error) {
    next(error);
  }
});

// End/Complete study session
router.patch('/:id/complete', authenticate, async (req, res, next) => {
  try {
    const { notes } = req.body;

    const session = await prisma.studySession.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.completed) {
      return res.status(400).json({ error: 'Session already completed' });
    }

    const updated = await prisma.studySession.update({
      where: { id: req.params.id },
      data: {
        completed: true,
        endedAt: new Date(),
        notes: notes || null,
      },
    });

    // Update streaks and check badges
    await updateStreaks(req.user.id, 'daily_study');
    await checkBadges(req.user.id, 'session_completed', {
      duration: updated.duration,
      type: updated.type,
    });

    await logActivity(req.user.id, 'session_completed', 'session', session.id, {
      duration: updated.duration,
      type: updated.type,
    });

    res.json({ session: updated });
  } catch (error) {
    next(error);
  }
});

// Get session statistics
router.get('/stats/summary', authenticate, async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const sessions = await prisma.studySession.findMany({
      where: {
        userId: req.user.id,
        completed: true,
        startedAt: {
          gte: startDate,
        },
      },
    });

    const totalMinutes = sessions.reduce((sum, s) => sum + s.duration, 0);
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
    const averageSession = sessions.length > 0 ? Math.round(totalMinutes / sessions.length) : 0;

    const byType = sessions.reduce((acc, s) => {
      acc[s.type] = (acc[s.type] || 0) + 1;
      return acc;
    }, {});

    res.json({
      totalSessions: sessions.length,
      totalMinutes,
      totalHours,
      averageSessionMinutes: averageSession,
      sessionsByType: byType,
      period: `${days} days`,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

