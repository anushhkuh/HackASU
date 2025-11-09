import axios from 'axios';

/**
 * Canvas API client for fetching assignments, courses, and other data
 */
export class CanvasAPI {
  constructor(accessToken, baseUrl) {
    this.accessToken = accessToken;
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.client = axios.create({
      baseURL: `${this.baseUrl}/api/v1`,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get current user's profile
   */
  async getCurrentUser() {
    try {
      const response = await this.client.get('/users/self');
      return response.data;
    } catch (error) {
      throw new Error(`Canvas API error: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get all courses for the current user
   */
  async getCourses(enrollmentType = 'student') {
    try {
      const response = await this.client.get('/courses', {
        params: {
          enrollment_type: enrollmentType,
          enrollment_role: 'StudentEnrollment',
          include: ['syllabus_body', 'term'],
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Canvas API error: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get assignments for a specific course
   */
  async getCourseAssignments(courseId, bucket = null) {
    try {
      const params = {
        include: ['submission', 'overrides'],
      };
      // Only filter by bucket if specified (null = get all assignments)
      if (bucket) {
        params.bucket = bucket; // upcoming, past, undated
      }
      const response = await this.client.get(`/courses/${courseId}/assignments`, { params });
      return response.data;
    } catch (error) {
      throw new Error(`Canvas API error: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get all assignments across all courses
   */
  async getAllAssignments() {
    try {
      const courses = await this.getCourses();
      const allAssignments = [];

      for (const course of courses) {
        try {
          const assignments = await this.getCourseAssignments(course.id);
          assignments.forEach(assignment => {
            allAssignments.push({
              ...assignment,
              courseId: course.id,
              courseName: course.name,
            });
          });
        } catch (error) {
          console.error(`Error fetching assignments for course ${course.id}:`, error.message);
        }
      }

      return allAssignments;
    } catch (error) {
      throw new Error(`Canvas API error: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get assignment details
   */
  async getAssignment(courseId, assignmentId) {
    try {
      const response = await this.client.get(`/courses/${courseId}/assignments/${assignmentId}`, {
        params: {
          include: ['submission', 'overrides'],
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Canvas API error: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get announcements for courses
   */
  async getAnnouncements(courseIds = []) {
    try {
      const response = await this.client.get('/announcements', {
        params: {
          context_codes: courseIds.map(id => `course_${id}`),
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Canvas API error: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get user's submissions
   */
  async getSubmissions(courseId, assignmentId) {
    try {
      const response = await this.client.get(
        `/courses/${courseId}/assignments/${assignmentId}/submissions/self`
      );
      return response.data;
    } catch (error) {
      throw new Error(`Canvas API error: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get grades for a specific course
   */
  async getCourseGrades(courseId) {
    try {
      const response = await this.client.get(`/courses/${courseId}/students/submissions`, {
        params: {
          student_ids: ['self'],
          include: ['assignment', 'submission_comments'],
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Canvas API error: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get all grades across all courses
   */
  async getAllGrades() {
    try {
      const courses = await this.getCourses();
      const allGrades = [];

      for (const course of courses) {
        try {
          const grades = await this.getCourseGrades(course.id);
          grades.forEach(grade => {
            allGrades.push({
              ...grade,
              courseId: course.id,
              courseName: course.name,
              assignmentName: grade.assignment?.name || 'N/A',
            });
          });
        } catch (error) {
          console.error(`Error fetching grades for course ${course.id}:`, error.message);
        }
      }

      return allGrades;
    } catch (error) {
      throw new Error(`Canvas API error: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get course schedule/calendar events
   */
  async getCourseSchedule(courseIds = []) {
    try {
      const response = await this.client.get('/calendar_events', {
        params: {
          context_codes: courseIds.map(id => `course_${id}`),
          type: 'event',
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Canvas API error: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get files for a specific course
   */
  async getCourseFiles(courseId) {
    try {
      const response = await this.client.get(`/courses/${courseId}/files`, {
        params: {
          per_page: 100,
        },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Canvas API error: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get all files across all courses
   */
  async getAllFiles() {
    try {
      const courses = await this.getCourses();
      const allFiles = [];

      for (const course of courses) {
        try {
          const files = await this.getCourseFiles(course.id);
          files.forEach(file => {
            allFiles.push({
              ...file,
              courseId: course.id,
              courseName: course.name,
            });
          });
        } catch (error) {
          console.error(`Error fetching files for course ${course.id}:`, error.message);
        }
      }

      return allFiles;
    } catch (error) {
      throw new Error(`Canvas API error: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get file download URL
   */
  async getFileUrl(fileId) {
    try {
      const response = await this.client.get(`/files/${fileId}`, {
        params: {
          include: ['preview_url'],
        },
      });
      const fileData = response.data;
      
      // Ensure we have a download URL
      if (!fileData.url && fileData.id) {
        // Construct download URL if not provided
        fileData.url = `${this.baseUrl}/api/v1/files/${fileId}?access_token=${this.accessToken}`;
      }
      
      return fileData;
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      throw new Error(`Canvas API error: ${errorMsg}`);
    }
  }
}

/**
 * OAuth2 helper functions for Canvas
 */
export const getCanvasAuthUrl = (state) => {
  const baseUrl = process.env.CANVAS_BASE_URL?.replace(/\/$/, '');
  const clientId = process.env.CANVAS_CLIENT_ID;
  const redirectUri = process.env.CANVAS_REDIRECT_URI;

  if (!baseUrl) {
    throw new Error('CANVAS_BASE_URL is not set in environment variables');
  }
  if (!clientId) {
    throw new Error('CANVAS_CLIENT_ID is not set in environment variables. Please create a Canvas OAuth app and add the Client ID to your .env file. See SETUP_CANVAS_OAUTH.md for instructions.');
  }
  if (!redirectUri) {
    throw new Error('CANVAS_REDIRECT_URI is not set in environment variables');
  }

  return `${baseUrl}/login/oauth2/auth?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
};

export const exchangeCanvasCode = async (code) => {
  try {
    const baseUrl = process.env.CANVAS_BASE_URL?.replace(/\/$/, '');
    const clientId = process.env.CANVAS_CLIENT_ID;
    const clientSecret = process.env.CANVAS_CLIENT_SECRET;
    const redirectUri = process.env.CANVAS_REDIRECT_URI;

    if (!baseUrl) {
      throw new Error('CANVAS_BASE_URL is not set in environment variables');
    }
    if (!clientId) {
      throw new Error('CANVAS_CLIENT_ID is not set in environment variables');
    }
    if (!clientSecret) {
      throw new Error('CANVAS_CLIENT_SECRET is not set in environment variables');
    }
    if (!redirectUri) {
      throw new Error('CANVAS_REDIRECT_URI is not set in environment variables');
    }

    const response = await axios.post(`${baseUrl}/login/oauth2/token`, {
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code: code,
    });

    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.error_description || error.message;
    if (errorMsg.includes('invalid_client') || errorMsg.includes('unknown client')) {
      throw new Error(`Canvas OAuth error: Invalid client. Please check your CANVAS_CLIENT_ID and CANVAS_CLIENT_SECRET in .env file. See SETUP_CANVAS_OAUTH.md for setup instructions.`);
    }
    throw new Error(`Canvas OAuth error: ${errorMsg}`);
  }
};

