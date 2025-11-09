import express from 'express';
import { prisma } from '../server.js';
import { authenticate } from '../middleware/auth.js';
import { CanvasAPI } from '../utils/canvas.js';
import { analyzeAssignments, analyzePerformance } from '../gemini.js';
import { logActivity } from '../utils/activityLogger.js';

const router = express.Router();

/**
 * Comprehensive sync endpoint that:
 * 1. Fetches all Canvas data (assignments, courses, announcements, grades, schedule)
 * 2. Syncs assignments to database
 * 3. Optionally processes with Gemini AI
 */
router.post('/canvas', authenticate, async (req, res, next) => {
  try {
    if (!req.user.canvasToken || !req.user.canvasInstanceUrl) {
      return res.status(400).json({ error: 'Canvas not connected. Please connect Canvas first.' });
    }

    const { useGemini = false } = req.body; // Optional: process with Gemini

    const canvasAPI = new CanvasAPI(req.user.canvasToken, req.user.canvasInstanceUrl);
    
    // Fetch all Canvas data in parallel
    const [courses, canvasAssignments, announcements, grades, schedule] = await Promise.all([
      canvasAPI.getCourses(),
      canvasAPI.getAllAssignments(),
      (async () => {
        const courses = await canvasAPI.getCourses();
        const courseIds = courses.map(c => c.id);
        return canvasAPI.getAnnouncements(courseIds);
      })(),
      canvasAPI.getAllGrades(),
      (async () => {
        const courses = await canvasAPI.getCourses();
        const courseIds = courses.map(c => c.id);
        return canvasAPI.getCourseSchedule(courseIds);
      })(),
    ]);

    // Sync assignments to database
    let synced = 0;
    let updated = 0;
    const errors = [];

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

    // Get synced assignments from database
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

    // Process with Gemini if requested
    let geminiAnalysis = null;
    let performanceAnalysis = null;

    if (useGemini && process.env.GEMINI_API_KEY) {
      try {
        // Analyze assignments
        const assignmentAnalysis = await analyzeAssignments(dbAssignments, courses);
        geminiAnalysis = {
          assignments: assignmentAnalysis.reply,
        };

        // Analyze performance if grades are available
        if (grades.length > 0) {
          const formattedGrades = grades.map(g => ({
            assignmentName: g.assignmentName,
            courseName: g.courseName,
            score: g.score,
            pointsPossible: g.assignment?.points_possible || null,
            grade: g.grade,
            submittedAt: g.submitted_at,
          }));

          const perfAnalysis = await analyzePerformance(
            formattedGrades,
            dbAssignments,
            courses
          );
          performanceAnalysis = {
            performance: perfAnalysis.reply,
          };
        }
      } catch (geminiError) {
        console.error('Gemini analysis error:', geminiError);
        // Don't fail the sync if Gemini fails
      }
    }

    // Log activity
    await logActivity(req.user.id, 'canvas_synced', 'user', req.user.id, {
      synced,
      updated,
      coursesCount: courses.length,
      assignmentsCount: canvasAssignments.length,
      announcementsCount: announcements.length,
      gradesCount: grades.length,
      scheduleCount: schedule.length,
      geminiUsed: useGemini,
    });

    res.json({
      message: 'Canvas sync completed successfully',
      sync: {
        assignments: {
          synced,
          updated,
          total: canvasAssignments.length,
          errors: errors.length,
          errorDetails: errors,
        },
        courses: courses.length,
        announcements: announcements.length,
        grades: grades.length,
        schedule: schedule.length,
      },
      data: {
        courses,
        assignments: canvasAssignments,
        announcements,
        grades,
        schedule,
      },
      gemini: geminiAnalysis || null,
      performance: performanceAnalysis || null,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Quick sync - just assignments (faster, no Gemini)
 */
router.post('/assignments', authenticate, async (req, res, next) => {
  try {
    if (!req.user.canvasToken || !req.user.canvasInstanceUrl) {
      return res.status(400).json({ error: 'Canvas not connected. Please connect Canvas first.' });
    }

    const canvasAPI = new CanvasAPI(req.user.canvasToken, req.user.canvasInstanceUrl);
    const canvasAssignments = await canvasAPI.getAllAssignments();

    let synced = 0;
    let updated = 0;
    const errors = [];

    for (const canvasAssignment of canvasAssignments) {
      try {
        const dueDate = canvasAssignment.due_at ? new Date(canvasAssignment.due_at) : null;
        const now = new Date();

        let status = 'pending';
        if (canvasAssignment.submission?.submitted_at) {
          status = 'completed';
        } else if (dueDate && dueDate < now) {
          status = 'overdue';
        }

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
      message: 'Assignments synced successfully',
      synced,
      updated,
      total: canvasAssignments.length,
      errors: errors.length,
      errorDetails: errors,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

