// API Client for backend integration
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000';

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

// Make API request
async function apiRequest(endpoint, options = {}) {
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
    
    // Handle network errors
    if (!response) {
      throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:3000');
    }
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { error: response.statusText || `Server error: ${response.status}` };
      }
      
      // Use the actual error message from the backend
      const errorMessage = errorData.error || errorData.message || `Server error: ${response.status}`;
      
      // Create error with backend message
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = errorData;
      throw error;
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return await response.text();
  } catch (error) {
    // Enhanced error handling
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Cannot connect to server. Please make sure the backend is running on http://localhost:3000');
    }
    console.error('API request failed:', error);
    throw error;
  }
}

// API Client object with common methods
const apiClient = {
  get: (endpoint) => apiRequest(endpoint, { method: 'GET' }),
  post: (endpoint, body) => apiRequest(endpoint, { method: 'POST', body }),
  put: (endpoint, body) => apiRequest(endpoint, { method: 'PUT', body }),
  patch: (endpoint, body) => apiRequest(endpoint, { method: 'PATCH', body }),
  delete: (endpoint) => apiRequest(endpoint, { method: 'DELETE' }),
};

// Auth API
export const authAPI = {
  register: (email, password, name) => apiClient.post('/api/auth/register', { email, password, name }),
  login: (email, password) => apiClient.post('/api/auth/login', { email, password }),
  getMe: () => apiClient.get('/api/auth/me'),
  getCanvasAuthUrl: () => apiClient.get('/api/auth/canvas/authorize'),
  connectCanvas: (code) => apiClient.post('/api/auth/canvas/callback', { code }),
  quickConnectCanvas: () => apiClient.post('/api/auth/canvas/quick-connect'),
  connectCanvasWithToken: (token, baseUrl) => apiClient.post('/api/auth/canvas/connect-token', { token, baseUrl }),
  disconnectCanvas: () => apiClient.post('/api/auth/canvas/disconnect'),
};

export default apiClient;

