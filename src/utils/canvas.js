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
  async getCourseAssignments(courseId) {
    try {
      const response = await this.client.get(`/courses/${courseId}/assignments`, {
        params: {
          include: ['submission', 'overrides'],
          bucket: 'upcoming', // upcoming, past, undated
        },
      });
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
}

/**
 * OAuth2 helper functions for Canvas
 */
export const getCanvasAuthUrl = (state) => {
  const baseUrl = process.env.CANVAS_BASE_URL.replace(/\/$/, '');
  const clientId = process.env.CANVAS_CLIENT_ID;
  const redirectUri = encodeURIComponent(process.env.CANVAS_REDIRECT_URI);

  return `${baseUrl}/login/oauth2/auth?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&state=${state}`;
};

export const exchangeCanvasCode = async (code) => {
  try {
    const baseUrl = process.env.CANVAS_BASE_URL.replace(/\/$/, '');
    const response = await axios.post(`${baseUrl}/login/oauth2/token`, {
      grant_type: 'authorization_code',
      client_id: process.env.CANVAS_CLIENT_ID,
      client_secret: process.env.CANVAS_CLIENT_SECRET,
      redirect_uri: process.env.CANVAS_REDIRECT_URI,
      code: code,
    });

    return response.data;
  } catch (error) {
    throw new Error(`Canvas OAuth error: ${error.response?.data?.error_description || error.message}`);
  }
};

