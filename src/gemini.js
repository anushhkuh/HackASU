import axios from 'axios';

/**
 * Gemini API client for AI-powered analysis and recommendations
 */
export async function askGemini(prompt, options = {}) {
  const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-pro';
  const API_KEY = process.env.GEMINI_API_KEY;

  if (!API_KEY) {
    throw new Error('GEMINI_API_KEY is not set in environment variables');
  }

  try {
    // Build parts array - can include both text and file data
    const parts = [{ text: prompt }];
    
    // If PDF data is provided (base64), add it as inline data
    if (options.pdfData && options.mimeType) {
      parts.push({
        inline_data: {
          mime_type: options.mimeType,
          data: options.pdfData,
        },
      });
    }

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${API_KEY}`,
      {
        contents: [
          {
            role: 'user',
            parts: parts,
          },
        ],
      },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    return {
      reply: response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '',
      raw: response.data,
    };
  } catch (err) {
    console.error('Gemini API error:', err.response?.data || err.message);
    throw err;
  }
}

/**
 * Analyze Canvas assignments with Gemini AI
 */
export async function analyzeAssignments(assignments, courses) {
  const prompt = `You are an AI study assistant helping a student manage their assignments. 

Here are their Canvas courses and assignments:

COURSES:
${courses.map(c => `- ${c.name} (ID: ${c.id})`).join('\n')}

ASSIGNMENTS:
${assignments.map(a => `
- ${a.title}
  Course: ${a.courseName}
  Due Date: ${a.dueDate ? new Date(a.dueDate).toLocaleDateString() : 'No due date'}
  Status: ${a.status}
  Priority: ${a.priority}
  ${a.description ? `Description: ${a.description.substring(0, 200)}...` : ''}
`).join('\n')}

Please provide:
1. A prioritized list of assignments (most urgent first)
2. Estimated time needed for each assignment
3. Study recommendations for each assignment
4. A suggested study schedule for the next week
5. Any warnings about upcoming deadlines

Format your response as a structured JSON object with the following structure:
{
  "prioritizedAssignments": [{"title": "...", "priority": "...", "reason": "..."}],
  "timeEstimates": [{"title": "...", "estimatedMinutes": ...}],
  "studyRecommendations": [{"title": "...", "recommendations": "..."}],
  "weeklySchedule": {"monday": [...], "tuesday": [...], ...},
  "deadlineWarnings": [{"title": "...", "daysUntilDue": ..., "warning": "..."}],
  "summary": "..."
}

If you cannot parse the data, provide a helpful text response instead.`;

  try {
    const result = await askGemini(prompt);
    return result;
  } catch (error) {
    throw new Error(`Gemini analysis failed: ${error.message}`);
  }
}

/**
 * Analyze student performance with Gemini AI
 */
export async function analyzePerformance(grades, assignments, courses) {
  const prompt = `You are an AI tutor analyzing a student's academic performance.

COURSES:
${courses.map(c => `- ${c.name} (ID: ${c.id})`).join('\n')}

GRADES:
${grades.map(g => `
- ${g.assignmentName || 'N/A'}
  Course: ${g.courseName || 'N/A'}
  Score: ${g.score !== null ? g.score : 'N/A'} / ${g.pointsPossible || 'N/A'}
  Grade: ${g.grade || 'N/A'}
  Submitted: ${g.submittedAt ? new Date(g.submittedAt).toLocaleDateString() : 'Not submitted'}
`).join('\n')}

ASSIGNMENT STATUS:
${assignments.map(a => `- ${a.title}: ${a.status}`).join('\n')}

Please provide:
1. Overall performance analysis
2. Strengths and areas for improvement
3. Course-specific feedback
4. Recommendations for improvement
5. Study strategy suggestions

Format as a structured analysis with actionable insights.`;

  try {
    const result = await askGemini(prompt);
    return result;
  } catch (error) {
    throw new Error(`Gemini performance analysis failed: ${error.message}`);
  }
}

/**
 * Generate personalized study recommendations
 */
export async function generateStudyRecommendations(userData, assignments, studyHistory) {
  const prompt = `You are an AI study coach providing personalized recommendations.

STUDENT PROFILE:
- Study sessions completed: ${studyHistory.totalSessions || 0}
- Average session duration: ${studyHistory.avgDuration || 0} minutes
- Current streak: ${studyHistory.currentStreak || 0} days
- Preferred study times: ${userData.preferredStudyTimes || 'Not specified'}

UPCOMING ASSIGNMENTS:
${assignments.slice(0, 10).map(a => `
- ${a.title} (Due: ${a.dueDate ? new Date(a.dueDate).toLocaleDateString() : 'No due date'})
`).join('\n')}

Based on this information, provide:
1. Personalized study schedule recommendations
2. Optimal study times based on their patterns
3. Assignment prioritization strategy
4. Motivation and encouragement
5. Tips for maintaining focus and productivity

Provide a friendly, encouraging response that helps the student succeed.`;

  try {
    const result = await askGemini(prompt);
    return result;
  } catch (error) {
    throw new Error(`Gemini recommendation generation failed: ${error.message}`);
  }
}

/**
 * Summarize PDF content using Gemini
 */
export async function summarizePDF(pdfContent, fileName, courseName) {
  const prompt = `You are an AI study assistant helping a student understand course materials.

Please summarize the following PDF document from the course "${courseName}".

PDF File: ${fileName}

PDF Content:
${pdfContent}

Please provide:
1. A concise summary of the main topics and key concepts
2. Important definitions, formulas, or facts
3. Main takeaways and learning objectives
4. Any questions or areas that might need further study

Format the summary in a clear, organized way that's easy to study from. Use bullet points and clear headings.`;

  try {
    const result = await askGemini(prompt);
    return {
      summary: result.reply,
      fileName,
      courseName,
    };
  } catch (error) {
    throw new Error(`Gemini PDF summarization failed: ${error.message}`);
  }
}

