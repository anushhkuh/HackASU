    import express from 'express';
import { prisma } from '../server.js';
import { authenticate } from '../middleware/auth.js';
import { CanvasAPI } from '../utils/canvas.js';

const router = express.Router();

// Get Canvas courses
router.get('/courses', authenticate, async (req, res, next) => {
  try {
    if (!req.user.canvasToken || !req.user.canvasInstanceUrl) {
      return res.status(400).json({ error: 'Canvas not connected' });
    }

    const canvasAPI = new CanvasAPI(req.user.canvasToken, req.user.canvasInstanceUrl);
    const courses = await canvasAPI.getCourses();

    res.json({ courses });
  } catch (error) {
    next(error);
  }
});

// Get Canvas user info
router.get('/user', authenticate, async (req, res, next) => {
  try {
    if (!req.user.canvasToken || !req.user.canvasInstanceUrl) {
      return res.status(400).json({ error: 'Canvas not connected' });
    }

    const canvasAPI = new CanvasAPI(req.user.canvasToken, req.user.canvasInstanceUrl);
    const user = await canvasAPI.getCurrentUser();

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

// Get announcements
router.get('/announcements', authenticate, async (req, res, next) => {
  try {
    if (!req.user.canvasToken || !req.user.canvasInstanceUrl) {
      return res.status(400).json({ error: 'Canvas not connected' });
    }

    const canvasAPI = new CanvasAPI(req.user.canvasToken, req.user.canvasInstanceUrl);
    const courses = await canvasAPI.getCourses();
    const courseIds = courses.map(c => c.id);

    const announcements = await canvasAPI.getAnnouncements(courseIds);

    res.json({ announcements });
  } catch (error) {
    next(error);
  }
});

// Get all assignments
router.get('/assignments', authenticate, async (req, res, next) => {
  try {
    if (!req.user.canvasToken || !req.user.canvasInstanceUrl) {
      return res.status(400).json({ error: 'Canvas not connected' });
    }

    const canvasAPI = new CanvasAPI(req.user.canvasToken, req.user.canvasInstanceUrl);
    const assignments = await canvasAPI.getAllAssignments();

    res.json({ assignments });
  } catch (error) {
    next(error);
  }
});

// Get grades
router.get('/grades', authenticate, async (req, res, next) => {
  try {
    if (!req.user.canvasToken || !req.user.canvasInstanceUrl) {
      return res.status(400).json({ error: 'Canvas not connected' });
    }

    const canvasAPI = new CanvasAPI(req.user.canvasToken, req.user.canvasInstanceUrl);
    const grades = await canvasAPI.getAllGrades();

    res.json({ grades });
  } catch (error) {
    next(error);
  }
});

// Get course schedule/calendar events
router.get('/schedule', authenticate, async (req, res, next) => {
  try {
    if (!req.user.canvasToken || !req.user.canvasInstanceUrl) {
      return res.status(400).json({ error: 'Canvas not connected' });
    }

    const canvasAPI = new CanvasAPI(req.user.canvasToken, req.user.canvasInstanceUrl);
    const courses = await canvasAPI.getCourses();
    const courseIds = courses.map(c => c.id);

    const schedule = await canvasAPI.getCourseSchedule(courseIds);

    res.json({ schedule, courses });
  } catch (error) {
    next(error);
  }
});

// Get all files from Canvas courses
router.get('/files', authenticate, async (req, res, next) => {
  try {
    if (!req.user.canvasToken || !req.user.canvasInstanceUrl) {
      return res.status(400).json({ error: 'Canvas not connected' });
    }

    const canvasAPI = new CanvasAPI(req.user.canvasToken, req.user.canvasInstanceUrl);
    const files = await canvasAPI.getAllFiles();

    // Filter for PDFs only
    const pdfFiles = files.filter(file => 
      file.content_type === 'application/pdf' || 
      file.filename?.toLowerCase().endsWith('.pdf')
    );

    res.json({ files: pdfFiles });
  } catch (error) {
    next(error);
  }
});

// Get files for a specific course
router.get('/files/:courseId', authenticate, async (req, res, next) => {
  try {
    if (!req.user.canvasToken || !req.user.canvasInstanceUrl) {
      return res.status(400).json({ error: 'Canvas not connected' });
    }

    const canvasAPI = new CanvasAPI(req.user.canvasToken, req.user.canvasInstanceUrl);
    const files = await canvasAPI.getCourseFiles(req.params.courseId);

    // Filter for PDFs only
    const pdfFiles = files.filter(file => 
      file.content_type === 'application/pdf' || 
      file.filename?.toLowerCase().endsWith('.pdf')
    );

    res.json({ files: pdfFiles });
  } catch (error) {
    next(error);
  }
});

export default router;

