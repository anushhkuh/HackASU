import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { askGemini, analyzeAssignments, analyzePerformance, generateStudyRecommendations } from '../gemini.js';
import { CanvasAPI } from '../utils/canvas.js';
import { prisma } from '../server.js';

const router = express.Router();

// Simple Gemini ask endpoint
router.post('/ask', authenticate, async (req, res, next) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const result = await askGemini(prompt);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Analyze assignments with Gemini
router.post('/analyze-assignments', authenticate, async (req, res, next) => {
  try {
    if (!req.user.canvasToken || !req.user.canvasInstanceUrl) {
      return res.status(400).json({ error: 'Canvas not connected' });
    }

    const canvasAPI = new CanvasAPI(req.user.canvasToken, req.user.canvasInstanceUrl);
    
    // Fetch Canvas data
    const courses = await canvasAPI.getCourses();
    const assignments = await canvasAPI.getAllAssignments();

    // Get assignments from database
    const dbAssignments = await prisma.assignment.findMany({
      where: { userId: req.user.id },
      select: {
        title: true,
        courseName: true,
        dueDate: true,
        status: true,
        priority: true,
        description: true,
      },
    });

    // Analyze with Gemini
    const analysis = await analyzeAssignments(dbAssignments.length > 0 ? dbAssignments : assignments, courses);

    res.json({
      analysis: analysis.reply,
      raw: analysis.raw,
      assignmentsCount: assignments.length,
      coursesCount: courses.length,
    });
  } catch (error) {
    next(error);
  }
});

// Analyze performance with Gemini
router.post('/analyze-performance', authenticate, async (req, res, next) => {
  try {
    if (!req.user.canvasToken || !req.user.canvasInstanceUrl) {
      return res.status(400).json({ error: 'Canvas not connected' });
    }

    const canvasAPI = new CanvasAPI(req.user.canvasToken, req.user.canvasInstanceUrl);
    
    // Fetch Canvas data
    const courses = await canvasAPI.getCourses();
    const grades = await canvasAPI.getAllGrades();
    const assignments = await canvasAPI.getAllAssignments();

    // Get assignments from database
    const dbAssignments = await prisma.assignment.findMany({
      where: { userId: req.user.id },
      select: {
        title: true,
        status: true,
      },
    });

    // Format grades for analysis
    const formattedGrades = grades.map(g => ({
      assignmentName: g.assignmentName,
      courseName: g.courseName,
      score: g.score,
      pointsPossible: g.assignment?.points_possible || null,
      grade: g.grade,
      submittedAt: g.submitted_at,
    }));

    // Analyze with Gemini
    const analysis = await analyzePerformance(
      formattedGrades,
      dbAssignments.length > 0 ? dbAssignments : assignments,
      courses
    );

    res.json({
      analysis: analysis.reply,
      raw: analysis.raw,
      gradesCount: grades.length,
    });
  } catch (error) {
    next(error);
  }
});

// Generate personalized study recommendations
router.post('/recommendations', authenticate, async (req, res, next) => {
  try {
    if (!req.user.canvasToken || !req.user.canvasInstanceUrl) {
      return res.status(400).json({ error: 'Canvas not connected' });
    }

    const canvasAPI = new CanvasAPI(req.user.canvasToken, req.user.canvasInstanceUrl);
    
    // Fetch assignments
    const assignments = await canvasAPI.getAllAssignments();

    // Get user data and study history
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        preferences: true,
      },
    });

    const studySessions = await prisma.studySession.findMany({
      where: { userId: req.user.id },
      select: {
        duration: true,
        startedAt: true,
      },
      orderBy: { startedAt: 'desc' },
      take: 100,
    });

    const streaks = await prisma.streak.findMany({
      where: { userId: req.user.id },
    });

    // Calculate study history stats
    const totalSessions = studySessions.length;
    const avgDuration = totalSessions > 0
      ? Math.round(studySessions.reduce((sum, s) => sum + s.duration, 0) / totalSessions)
      : 0;
    const currentStreak = streaks.find(s => s.type === 'daily_study')?.current || 0;

    const studyHistory = {
      totalSessions,
      avgDuration,
      currentStreak,
    };

    // Get assignments from database
    const dbAssignments = await prisma.assignment.findMany({
      where: { userId: req.user.id },
      select: {
        title: true,
        dueDate: true,
        status: true,
      },
      orderBy: { dueDate: 'asc' },
      take: 20,
    });

    // Generate recommendations with Gemini
    const recommendations = await generateStudyRecommendations(
      user || {},
      dbAssignments.length > 0 ? dbAssignments : assignments.slice(0, 20),
      studyHistory
    );

    res.json({
      recommendations: recommendations.reply,
      raw: recommendations.raw,
      studyHistory,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

