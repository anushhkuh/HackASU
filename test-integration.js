/**
 * Quick Integration Test Script
 * Tests Canvas + Gemini integration
 * 
 * Usage: node test-integration.js
 * Make sure backend is running first!
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';
let authToken = null;
let userId = null;

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

async function testEndpoint(name, method, endpoint, data = null, requiresAuth = true) {
  try {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (requiresAuth && authToken) {
      config.headers['Authorization'] = `Bearer ${authToken}`;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    success(`${name}: OK`);
    return response.data;
  } catch (err) {
    error(`${name}: ${err.response?.data?.error || err.message}`);
    if (err.response?.status === 401) {
      warning('Authentication required - make sure you are logged in');
    }
    return null;
  }
}

async function runTests() {
  log('\n🧪 Starting Integration Tests...\n', 'blue');

  // Test 1: Health Check
  info('Test 1: Backend Health Check');
  const health = await testEndpoint('Health Check', 'GET', '/health', null, false);
  if (!health) {
    error('Backend is not running! Start it with: npm run dev');
    return;
  }

  // Test 2: Register/Login
  info('\nTest 2: Authentication');
  const testEmail = `test${Date.now()}@example.com`;
  const testPassword = 'test123456';

  const registerData = await testEndpoint(
    'Register',
    'POST',
    '/api/auth/register',
    { email: testEmail, password: testPassword, name: 'Test User' },
    false
  );

  if (registerData && registerData.token) {
    authToken = registerData.token;
    userId = registerData.user?.id;
    success('Registration successful, token obtained');
  } else {
    // Try login instead
    const loginData = await testEndpoint(
      'Login',
      'POST',
      '/api/auth/login',
      { email: 'test@example.com', password: 'test123' },
      false
    );
    if (loginData && loginData.token) {
      authToken = loginData.token;
      userId = loginData.user?.id;
      success('Login successful, token obtained');
    } else {
      error('Cannot proceed without authentication');
      return;
    }
  }

  // Test 3: Get User Info
  info('\nTest 3: User Info');
  const userInfo = await testEndpoint('Get User Info', 'GET', '/api/auth/me');
  if (userInfo) {
    info(`User: ${userInfo.user?.email}`);
    info(`Canvas Connected: ${userInfo.user?.hasCanvasConnection || false}`);
  }

  // Test 4: Canvas Connection Check
  info('\nTest 4: Canvas Connection');
  if (userInfo?.user?.hasCanvasConnection) {
    success('Canvas is connected');
    
    // Test 5: Fetch Canvas Data
    info('\nTest 5: Fetch Canvas Data');
    await testEndpoint('Get Courses', 'GET', '/api/canvas/courses');
    await testEndpoint('Get Assignments', 'GET', '/api/canvas/assignments');
    await testEndpoint('Get Grades', 'GET', '/api/canvas/grades');
    await testEndpoint('Get Announcements', 'GET', '/api/canvas/announcements');
    await testEndpoint('Get Schedule', 'GET', '/api/canvas/schedule');

    // Test 6: Sync
    info('\nTest 6: Canvas Sync');
    const syncResult = await testEndpoint('Sync Assignments', 'POST', '/api/sync/assignments');
    if (syncResult) {
      info(`Synced: ${syncResult.synced}, Updated: ${syncResult.updated}`);
    }

    // Test 7: Gemini (if API key is set)
    if (process.env.GEMINI_API_KEY) {
      info('\nTest 7: Gemini AI');
      await testEndpoint(
        'Gemini Simple Ask',
        'POST',
        '/api/gemini/ask',
        { prompt: 'Say hello in one word' }
      );
      
      await testEndpoint('Analyze Assignments', 'POST', '/api/gemini/analyze-assignments');
      await testEndpoint('Get Recommendations', 'POST', '/api/gemini/recommendations');
    } else {
      warning('\nTest 7: Gemini AI - Skipped (GEMINI_API_KEY not set)');
    }
  } else {
    warning('Canvas not connected - skipping Canvas tests');
    warning('To connect Canvas:');
    warning('1. Call GET /api/auth/canvas/authorize');
    warning('2. Authorize in browser');
    warning('3. Call POST /api/auth/canvas/callback with code');
  }

  // Test 8: Dashboard
  info('\nTest 8: Dashboard Data');
  await testEndpoint('Get Dashboard', 'GET', '/api/dashboard');
  await testEndpoint('Get Assignments', 'GET', '/api/assignments');

  log('\n✨ Tests Complete!\n', 'green');
  log('Check the results above. All ✅ means everything is working!', 'blue');
}

// Run tests
runTests().catch(err => {
  error(`Test suite failed: ${err.message}`);
  process.exit(1);
});

