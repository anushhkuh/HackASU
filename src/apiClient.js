// Backend API client
// Uses proxy in package.json for development (http://localhost:3000)
// Configure REACT_APP_API_BASE_URL in .env.local for production or custom setup

// Use relative URLs to leverage the proxy, or absolute URL if specified
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

// Get auth token from localStorage
function getAuthToken() {
  return localStorage.getItem('authToken');
}

// Set auth token in localStorage
export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('authToken', token);
  } else {
    localStorage.removeItem('authToken');
  }
}

async function apiRequest(endpoint, options = {}) {
  // Use relative URL (proxy will handle it) or absolute URL if API_BASE_URL is set
  const url = API_BASE_URL ? `${API_BASE_URL}${endpoint}` : endpoint;
  
  const token = getAuthToken();
  const config = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return await response.text();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

// Auth API calls
export const authAPI = {
  // Register new user
  register: (email, password, name) => apiRequest('/api/auth/register', {
    method: 'POST',
    body: { email, password, name },
  }),
  
  // Login
  login: (email, password) => apiRequest('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  }),
  
  // Get current user
  getMe: () => apiRequest('/api/auth/me'),
};

// Assignment-related API calls
export const assignmentsAPI = {
  // Get all assignments (returns { assignments: [...] })
  getAll: async () => {
    const response = await apiRequest('/api/assignments');
    // Backend returns { assignments: [...] }, extract the array
    return response.assignments || [];
  },
  
  // Get assignment by ID (returns { assignment: {...} })
  getById: async (id) => {
    const response = await apiRequest(`/api/assignments/${id}`);
    return response.assignment;
  },
  
  // Create new assignment
  // Backend expects: { title, description, dueDate, expectedDuration, courseId, courseName, priority }
  // Frontend sends: { name, due, duration, totalChunks, subject, ... }
  create: async (assignment) => {
    // Map frontend format to backend format
    const backendFormat = {
      title: assignment.name || assignment.title,
      description: assignment.description || null,
      dueDate: assignment.due || assignment.dueDate,
      expectedDuration: assignment.duration ? assignment.duration * 60 : null, // Convert hours to minutes
      courseName: assignment.subject || assignment.courseName,
      priority: assignment.priority || 'medium',
    };
    const response = await apiRequest('/api/assignments', {
      method: 'POST',
      body: backendFormat,
    });
    // Backend returns { assignment: {...} }, extract it
    return response.assignment;
  },
  
  // Update assignment
  update: async (id, assignment) => {
    // Map frontend format to backend format
    const backendFormat = {};
    if (assignment.name !== undefined) backendFormat.title = assignment.name;
    if (assignment.due !== undefined) backendFormat.dueDate = assignment.due;
    if (assignment.duration !== undefined) backendFormat.expectedDuration = assignment.duration * 60;
    if (assignment.subject !== undefined) backendFormat.courseName = assignment.subject;
    if (assignment.status !== undefined) backendFormat.status = assignment.status;
    
    const response = await apiRequest(`/api/assignments/${id}`, {
      method: 'PUT',
      body: backendFormat,
    });
    return response.assignment;
  },
  
  // Delete assignment
  delete: (id) => apiRequest(`/api/assignments/${id}`, {
    method: 'DELETE',
  }),
};

// Canvas-related API calls (if backend handles Canvas integration)
export const canvasAPI = {
  // Get courses
  getCourses: () => apiRequest('/api/canvas/courses'),
  
  // Get assignments for a course
  getCourseAssignments: (courseId) => apiRequest(`/api/canvas/courses/${courseId}/assignments`),
  
  // Import assignments from Canvas
  importAssignments: (courseId, assignmentIds) => apiRequest('/api/canvas/import', {
    method: 'POST',
    body: { courseId, assignmentIds },
  }),
};

// User/profile API calls
export const userAPI = {
  // Get current user
  getCurrentUser: () => apiRequest('/api/user'),
  
  // Update user settings
  updateSettings: (settings) => apiRequest('/api/user/settings', {
    method: 'PUT',
    body: settings,
  }),
};

export default {
  authAPI,
  assignmentsAPI,
  canvasAPI,
  userAPI,
  setAuthToken,
  // Direct API request method
  request: apiRequest,
};

