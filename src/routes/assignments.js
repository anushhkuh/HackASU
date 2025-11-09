import express from 'express';
import { prisma } from '../server.js';
import { authenticate } from '../middleware/auth.js';
import { CanvasAPI } from '../utils/canvas.js';
import { logActivity } from '../utils/activityLogger.js';
import { updateStreaks } from '../utils/gamification.js';

const router = express.Router();

// Get all assignments
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { status, courseId, upcoming } = req.query;

    const where = {
      userId: req.user.id,
      ...(status && { status }),
      ...(courseId && { courseId }),
    };

    if (upcoming === 'true') {
      where.dueDate = {
        gte: new Date(),
      };
    }

    const assignments = await prisma.assignment.findMany({
      where,
      include: {
        chunks: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    res.json({ assignments });
  } catch (error) {
    next(error);
  }
});

// Get single assignment
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
      include: {
        chunks: {
          orderBy: { order: 'asc' },
        },
        studySessions: {
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    res.json({ assignment });
  } catch (error) {
    next(error);
  }
});

// Sync assignments from Canvas
router.post('/sync', authenticate, async (req, res, next) => {
  try {
    if (!req.user.canvasToken || !req.user.canvasInstanceUrl) {
      return res.status(400).json({ error: 'Canvas not connected. Please connect Canvas first.' });
    }

    const canvasAPI = new CanvasAPI(req.user.canvasToken, req.user.canvasInstanceUrl);
    const canvasAssignments = await canvasAPI.getAllAssignments();

    let synced = 0;
    let updated = 0;
    let errors = [];

    for (const canvasAssignment of canvasAssignments) {
      try {
        const dueDate = canvasAssignment.due_at ? new Date(canvasAssignment.due_at) : null;
        const now = new Date();

        // Determine status
        let status = 'pending';
        if (canvasAssignment.submission?.submitted_at) {
          status = 'completed';
        } else if (dueDate && dueDate < now) {
          status = 'overdue';
        }

        // Calculate expected duration (if points are available, estimate 1 point = 10 minutes)
        const expectedDuration = canvasAssignment.points_possible
          ? Math.round(canvasAssignment.points_possible * 10)
          : null;

        const assignmentData = {
          canvasId: canvasAssignment.id.toString(),
          userId: req.user.id,
          courseId: canvasAssignment.courseId?.toString(),
          courseName: canvasAssignment.courseName,
          title: canvasAssignment.name,
          description: canvasAssignment.description || null,
          dueDate,
          expectedDuration,
          status,
          syncedAt: new Date(),
        };

        const existing = await prisma.assignment.findUnique({
          where: { canvasId: canvasAssignment.id.toString() },
        });

        if (existing) {
          await prisma.assignment.update({
            where: { canvasId: canvasAssignment.id.toString() },
            data: assignmentData,
          });
          updated++;
        } else {
          await prisma.assignment.create({
            data: assignmentData,
          });
          synced++;
        }
      } catch (error) {
        errors.push({ assignment: canvasAssignment.name, error: error.message });
      }
    }

    await logActivity(req.user.id, 'assignments_synced', 'assignment', null, {
      synced,
      updated,
      errors: errors.length,
    });

    res.json({
      message: 'Sync completed',
      synced,
      updated,
      errors: errors.length,
      errorDetails: errors,
    });
  } catch (error) {
    next(error);
  }
});

// Create manual assignment
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { title, description, dueDate, expectedDuration, courseId, courseName, priority } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const assignment = await prisma.assignment.create({
      data: {
        userId: req.user.id,
        title,
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        expectedDuration: expectedDuration || null,
        courseId: courseId || null,
        courseName: courseName || null,
        priority: priority || 'medium',
      },
      include: {
        chunks: true,
      },
    });

    await logActivity(req.user.id, 'assignment_created', 'assignment', assignment.id);

    res.status(201).json({ assignment });
  } catch (error) {
    next(error);
  }
});

// Update assignment
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { title, description, dueDate, expectedDuration, status, priority } = req.body;

    const assignment = await prisma.assignment.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (expectedDuration !== undefined) updateData.expectedDuration = expectedDuration;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;

    if (status === 'completed' && assignment.status !== 'completed') {
      updateData.completedAt = new Date();
      await updateStreaks(req.user.id, 'assignment_completion');
    }

    const updated = await prisma.assignment.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        chunks: {
          orderBy: { order: 'asc' },
        },
      },
    });

    await logActivity(req.user.id, 'assignment_updated', 'assignment', assignment.id, { status });

    res.json({ assignment: updated });
  } catch (error) {
    next(error);
  }
});

// Delete assignment
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    await prisma.assignment.delete({
      where: { id: req.params.id },
    });

    await logActivity(req.user.id, 'assignment_deleted', 'assignment', assignment.id);

    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Create chunks for assignment
router.post('/:id/chunks', authenticate, async (req, res, next) => {
  try {
    const { chunks } = req.body; // Array of { title, description, duration, order }

    if (!Array.isArray(chunks) || chunks.length === 0) {
      return res.status(400).json({ error: 'Chunks array is required' });
    }

    const assignment = await prisma.assignment.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Delete existing chunks
    await prisma.assignmentChunk.deleteMany({
      where: { assignmentId: req.params.id },
    });

    // Create new chunks
    const createdChunks = await prisma.assignmentChunk.createMany({
      data: chunks.map(chunk => ({
        assignmentId: req.params.id,
        title: chunk.title,
        description: chunk.description || null,
        duration: chunk.duration,
        order: chunk.order,
      })),
    });

    await logActivity(req.user.id, 'chunks_created', 'assignment', assignment.id, {
      chunkCount: chunks.length,
    });

    res.json({ message: 'Chunks created successfully', count: createdChunks.count });
  } catch (error) {
    next(error);
  }
});

// Auto-generate chunks based on duration
router.post('/:id/chunks/auto', authenticate, async (req, res, next) => {
  try {
    const { chunkDuration = 25 } = req.body; // Default 25 minutes (Pomodoro)

    const assignment = await prisma.assignment.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    if (!assignment.expectedDuration) {
      return res.status(400).json({ error: 'Assignment must have expected duration to auto-generate chunks' });
    }

    const numChunks = Math.ceil(assignment.expectedDuration / chunkDuration);

    // Delete existing chunks
    await prisma.assignmentChunk.deleteMany({
      where: { assignmentId: req.params.id },
    });

    // Create chunks
    const chunks = [];
    for (let i = 0; i < numChunks; i++) {
      const isLast = i === numChunks - 1;
      const duration = isLast
        ? assignment.expectedDuration - (i * chunkDuration)
        : chunkDuration;

      chunks.push({
        assignmentId: req.params.id,
        title: `Part ${i + 1}${isLast ? ' (Final)' : ''}`,
        description: `Chunk ${i + 1} of ${numChunks}`,
        duration,
        order: i,
      });
    }

    await prisma.assignmentChunk.createMany({
      data: chunks,
    });

    await logActivity(req.user.id, 'chunks_auto_generated', 'assignment', assignment.id, {
      chunkCount: chunks.length,
      chunkDuration,
    });

    res.json({ message: 'Chunks auto-generated successfully', chunks });
  } catch (error) {
    next(error);
  }
});

// Update chunk status
router.patch('/chunks/:chunkId', authenticate, async (req, res, next) => {
  try {
    const { status } = req.body;

    const chunk = await prisma.assignmentChunk.findUnique({
      where: { id: req.params.chunkId },
      include: { assignment: true },
    });

    if (!chunk || chunk.assignment.userId !== req.user.id) {
      return res.status(404).json({ error: 'Chunk not found' });
    }

    const updateData = { status };
    if (status === 'completed') {
      updateData.completedAt = new Date();
    }

    const updated = await prisma.assignmentChunk.update({
      where: { id: req.params.chunkId },
      data: updateData,
    });

    await logActivity(req.user.id, 'chunk_updated', 'assignment', chunk.assignmentId, { status });

    res.json({ chunk: updated });
  } catch (error) {
    next(error);
  }
});

export default router;

