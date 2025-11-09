import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { askGemini, analyzeAssignments, analyzePerformance, generateStudyRecommendations } from '../gemini.js';
import { CanvasAPI } from '../utils/canvas.js';
import { prisma } from '../server.js';
import axios from 'axios';
import { logActivity } from '../utils/activityLogger.js';

const router = express.Router();

// Test endpoint to verify route is working
router.get('/test', authenticate, (req, res) => {
  res.json({ message: 'Gemini route is working!', userId: req.user.id });
});

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

// Summarize a Canvas PDF file
router.post("/summarize-pdf", authenticate, async (req, res, next) => {
  console.log('📄 PDF Summarization request received:', {
    userId: req.user?.id,
    fileId: req.body?.fileId,
    hasCanvasToken: !!req.user?.canvasToken,
  });

  try {
    if (!req.user.canvasToken || !req.user.canvasInstanceUrl) {
      console.error('❌ Canvas not connected');
      return res.status(400).json({ error: "Canvas not connected" });
    }

    const { fileId, courseId, courseName } = req.body;
    if (!fileId) {
      console.error('❌ File ID missing');
      return res.status(400).json({ error: "File ID is required" });
    }

    // Check if GEMINI_API_KEY is set
    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY not set');
      return res.status(500).json({ 
        error: "GEMINI_API_KEY is not set in environment variables. Please add it to your .env file." 
      });
    }

    const canvasAPI = new CanvasAPI(req.user.canvasToken, req.user.canvasInstanceUrl);
    
    let fileInfo;
    try {
      console.log('📥 Fetching file info from Canvas...');
      fileInfo = await canvasAPI.getFileUrl(fileId);
      console.log('✅ File info fetched:', fileInfo.display_name || fileInfo.filename);
    } catch (error) {
      console.error('❌ Error fetching file info:', error.message);
      return res.status(404).json({ error: `File not found: ${error.message}` });
    }
    
    const fileName = fileInfo.display_name || fileInfo.filename || 'Unknown PDF';
    
    // Get download URL for the PDF - Canvas API provides url in fileInfo
    let downloadUrl = fileInfo.url;
    if (!downloadUrl) {
      // Fallback: construct URL manually
      downloadUrl = `${req.user.canvasInstanceUrl}/api/v1/files/${fileId}?access_token=${req.user.canvasToken}`;
    }
    
    console.log('📥 Download URL:', downloadUrl.substring(0, 100) + '...');
    
    try {
      console.log('📥 Downloading PDF from Canvas...');
      // Download the PDF file
      let pdfResponse;
      try {
        pdfResponse = await axios.get(downloadUrl, {
          responseType: 'arraybuffer',
          headers: {
            'Authorization': `Bearer ${req.user.canvasToken}`,
          },
          maxContentLength: 20 * 1024 * 1024, // 20MB limit
          maxBodyLength: 20 * 1024 * 1024,
          timeout: 30000, // 30 second timeout
        });
      } catch (downloadError) {
        console.error('❌ PDF download failed:', downloadError.message);
        // If direct download fails, try using Canvas API endpoint
        if (downloadError.response?.status === 401 || downloadError.response?.status === 403) {
          // Try alternative URL format
          const altUrl = `${req.user.canvasInstanceUrl}/api/v1/files/${fileId}?access_token=${req.user.canvasToken}`;
          console.log('🔄 Trying alternative download URL...');
          pdfResponse = await axios.get(altUrl, {
            responseType: 'arraybuffer',
            maxContentLength: 20 * 1024 * 1024,
            maxBodyLength: 20 * 1024 * 1024,
            timeout: 30000,
          });
        } else {
          throw downloadError;
        }
      }
      
      console.log('✅ PDF downloaded, size:', pdfResponse.data.length, 'bytes');
      
      // Check if file is too large (Gemini has limits)
      if (pdfResponse.data.length > 20 * 1024 * 1024) {
        throw new Error('PDF file is too large (max 20MB). Please use a smaller file.');
      }
      
      // Convert PDF to base64 for Gemini
      const base64Pdf = Buffer.from(pdfResponse.data).toString('base64');
      console.log('✅ PDF converted to base64, length:', base64Pdf.length);
      
      console.log('🤖 Calling Gemini API with PDF content...');
      // Use Gemini to summarize the PDF with actual PDF content
      const summaryPrompt = `You are an AI study assistant helping a student understand course materials.

Please analyze the attached PDF document from the course "${courseName || 'Unknown Course'}" and provide a comprehensive summary.

PDF File Name: ${fileName}

Please provide:
1. A concise summary of the main topics and key concepts covered in this PDF
2. Important definitions, formulas, or facts mentioned
3. Main takeaways and learning objectives
4. Any questions or areas that might need further study
5. Key sections or chapters and their main points

Format the summary in a clear, organized way that's easy to study from. Use bullet points and clear headings. Focus on the actual content of the PDF.`;

      const result = await askGemini(summaryPrompt, {
        pdfData: base64Pdf,
        mimeType: 'application/pdf',
      });
      console.log('✅ Gemini response received, length:', result.reply?.length || 0);
      
      // Save as a note in the database
      console.log('💾 Saving note to database...');
      const note = await prisma.note.create({
        data: {
          userId: req.user.id,
          title: `Summary: ${fileName}`,
          content: result.reply,
          type: 'lecture',
          courseId: courseId?.toString(),
          courseName: courseName || 'Unknown Course',
        },
      });
      console.log('✅ Note saved with ID:', note.id);

      await logActivity(req.user.id, 'pdf_summarized', 'note', note.id, {
        fileName,
        courseName,
      });

      res.json({
        success: true,
        summary: result.reply,
        note: {
          id: note.id,
          title: note.title,
          content: note.content,
        },
        fileName,
      });
    } catch (error) {
      console.error('❌ Error processing PDF with Gemini:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      
      // Provide more specific error messages
      let errorMessage = 'Failed to summarize PDF';
      if (error.message.includes('GEMINI_API_KEY')) {
        errorMessage = 'GEMINI_API_KEY is not set in environment variables';
      } else if (error.response?.status === 401) {
        errorMessage = 'Invalid Gemini API key. Please check your GEMINI_API_KEY in .env';
      } else if (error.response?.status === 429) {
        errorMessage = 'Gemini API rate limit exceeded. Please try again later.';
      } else {
        errorMessage = `Failed to summarize PDF: ${error.message}`;
      }
      
      return res.status(500).json({ 
        error: errorMessage,
        details: error.response?.data || error.message 
      });
    }
  } catch (err) {
    console.error('❌ PDF summarization error:', err);
    console.error('Error stack:', err.stack);
    next(err);
  }
});

export default router;

