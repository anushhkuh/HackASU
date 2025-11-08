import express from 'express';
import { prisma } from '../server.js';
import { authenticate } from '../middleware/auth.js';
import { logActivity } from '../utils/activityLogger.js';

const router = express.Router();

// Get all notes
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { type, courseId, tag } = req.query;

    const where = {
      userId: req.user.id,
      ...(type && { type }),
      ...(courseId && { courseId }),
      ...(tag && { tags: { has: tag } }),
    };

    const notes = await prisma.note.findMany({
      where,
      orderBy: {
        updatedAt: 'desc',
      },
    });

    res.json({ notes });
  } catch (error) {
    next(error);
  }
});

// Get single note
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const note = await prisma.note.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json({ note });
  } catch (error) {
    next(error);
  }
});

// Create note
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { title, content, type, tags, courseId, courseName } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const note = await prisma.note.create({
      data: {
        userId: req.user.id,
        title,
        content,
        type: type || 'general',
        tags: tags || [],
        courseId: courseId || null,
        courseName: courseName || null,
      },
    });

    await logActivity(req.user.id, 'note_created', 'note', note.id, { type });

    res.status(201).json({ note });
  } catch (error) {
    next(error);
  }
});

// Update note
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { title, content, type, tags, courseId, courseName } = req.body;

    const note = await prisma.note.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (type !== undefined) updateData.type = type;
    if (tags !== undefined) updateData.tags = tags;
    if (courseId !== undefined) updateData.courseId = courseId;
    if (courseName !== undefined) updateData.courseName = courseName;

    const updated = await prisma.note.update({
      where: { id: req.params.id },
      data: updateData,
    });

    await logActivity(req.user.id, 'note_updated', 'note', note.id);

    res.json({ note: updated });
  } catch (error) {
    next(error);
  }
});

// Delete note
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const note = await prisma.note.findFirst({
      where: {
        id: req.params.id,
        userId: req.user.id,
      },
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    await prisma.note.delete({
      where: { id: req.params.id },
    });

    await logActivity(req.user.id, 'note_deleted', 'note', note.id);

    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Get note templates
router.get('/templates/:type', authenticate, (req, res) => {
  const { type } = req.params;

  const templates = {
    lecture: {
      title: 'Lecture Notes Template',
      content: `# Lecture Notes: [Topic]

## Date: [Date]
## Course: [Course Name]

### Key Concepts
- 
- 
- 

### Important Points
1. 
2. 
3. 

### Questions/Clarifications
- 
- 

### Summary
[Your summary here]
`,
    },
    cheatsheet: {
      title: 'Exam Cheatsheet Template',
      content: `# Cheatsheet: [Topic]

## Key Formulas
- 
- 

## Important Definitions
- 
- 

## Common Mistakes to Avoid
- 
- 

## Quick Reference
- 
- 
`,
    },
    assignment: {
      title: 'Assignment Planning Template',
      content: `# Assignment: [Title]

## Due Date: [Date]
## Estimated Duration: [Time]

### Requirements
- 
- 

### Plan
1. 
2. 
3. 

### Resources Needed
- 
- 

### Notes
[Your notes here]
`,
    },
  };

  const template = templates[type] || templates.lecture;
  res.json({ template });
});

export default router;

