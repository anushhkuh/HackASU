import express from 'express';
import { prisma } from '../server.js';
import { authenticate } from '../middleware/auth.js';
import { logActivity } from '../utils/activityLogger.js';

const router = express.Router();

// Get all reminders
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { sent, upcoming } = req.query;

    const where = {
      userId: req.user.id,
      ...(sent !== undefined && { sent: sent === 'true' }),
    };

    if (upcoming === 'true') {
      where.scheduledAt = {
        gte: new Date(),
      };
      where.sent = false;
    }

    const reminders = await prisma.reminder.findMany({
      where,
      include: {
        assignment: {
          select: {
            id: true,
            title: true,
            dueDate: true,
          },
        },
      },
      orderBy: {
        scheduledAt: 'asc',
      },
    });

    res.json({ reminders });
  } catch (error) {
    next(error);
  }
});

// Create reminder
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { title, message, type, scheduledAt, assignmentId } = req.body;

    if (!title || !message || !scheduledAt) {
      return res.status(400).json({ error: 'Title, message, and scheduledAt are required' });
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

    const reminder = await prisma.reminder.create({
      data: {
        userId: req.user.id,
        title,
        message,
        type: type || 'custom',
        scheduledAt: new Date(scheduledAt),
        assignmentId: assignmentId || null,
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

    await logActivity(req.user.id, 'reminder_created', 'reminder', reminder.id, { type });

    res.status(201).json({ reminder });
  } catch (error) {
    next(error);
  }
});

// Auto-create reminders for upcoming assignments
router.post('/auto-assignments', authenticate, async (req, res, next) => {
  try {
    const { daysBefore = [1, 3, 7] } = req.body; // Remind 1, 3, and 7 days before

    const upcomingAssignments = await prisma.assignment.findMany({
      where: {
        userId: req.user.id,
        dueDate: {
          gte: new Date(),
        },
        status: {
          not: 'completed',
        },
      },
    });

    const created = [];

    for (const assignment of upcomingAssignments) {
      if (!assignment.dueDate) continue;

      for (const days of daysBefore) {
        const reminderDate = new Date(assignment.dueDate);
        reminderDate.setDate(reminderDate.getDate() - days);

        // Only create if reminder date is in the future
        if (reminderDate > new Date()) {
          // Check if reminder already exists
          const existing = await prisma.reminder.findFirst({
            where: {
              userId: req.user.id,
              assignmentId: assignment.id,
              scheduledAt: reminderDate,
            },
          });

          if (!existing) {
            const reminder = await prisma.reminder.create({
              data: {
                userId: req.user.id,
                title: `Assignment Due Soon: ${assignment.title}`,
                message: `${assignment.title} is due in ${days} day${days > 1 ? 's' : ''}`,
                type: 'assignment_due',
                scheduledAt: reminderDate,
                assignmentId: assignment.id,
              },
            });
            created.push(reminder);
          }
        }
      }
    }

    await logActivity(req.user.id, 'reminders_auto_created', 'reminder', null, {
      count: created.length,
    });

    res.json({
      message: `Created ${created.length} reminders`,
      reminders: created,
    });
  } catch (error) {
    next(error);
  }
});

// Update reminder
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { title, message, scheduledAt, sent } = req.body;

    const reminder = await prisma.reminder.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (message !== undefined) updateData.message = message;
    if (scheduledAt !== undefined) updateData.scheduledAt = new Date(scheduledAt);
    if (sent !== undefined) {
      updateData.sent = sent;
      if (sent) {
        updateData.sentAt = new Date();
      }
    }

    const updated = await prisma.reminder.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json({ reminder: updated });
  } catch (error) {
    next(error);
  }
});

// Delete reminder
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const reminder = await prisma.reminder.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    await prisma.reminder.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Reminder deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Mark reminder as sent (for external notification systems)
router.patch('/:id/sent', authenticate, async (req, res, next) => {
  try {
    const reminder = await prisma.reminder.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    const updated = await prisma.reminder.update({
      where: { id: req.params.id },
      data: {
        sent: true,
        sentAt: new Date(),
      },
    });

    res.json({ reminder: updated });
  } catch (error) {
    next(error);
  }
});

export default router;

