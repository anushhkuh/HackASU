import React, { useState, useEffect } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Dashboard from './pages/Dashboard';
import Notes from './pages/Notes';
import Cheatsheets from './pages/Cheatsheets';
import AssignmentChunking from './pages/AssignmentChunking';
import AttentionCheck from './pages/AttentionCheck';
import PomodoroWidget from './components/PomodoroWidget';
import { authAPI, setAuthToken } from './utils/apiClient';
import Login from './components/Login';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courses, setCourses] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);

  useEffect(() => {
    checkAuth();
    handleCanvasCallback();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadCourses();
    }
  }, [isAuthenticated, user]);

  const checkAuth = async () => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const response = await authAPI.getMe();
        setUser(response.user);
        setIsAuthenticated(true);
        setAuthToken(token);
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('authToken');
        setIsAuthenticated(false);
      }
    }
    setLoading(false);
  };

  const handleCanvasCallback = async () => {
    // Check if we're returning from Canvas OAuth
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');

    if (code && state) {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          console.error('No auth token found');
          return;
        }

        // Complete Canvas connection
        try {
          const data = await authAPI.connectCanvas(code);
          alert('Canvas connected successfully!');
          
          // Refresh user data
          const userResponse = await authAPI.getMe();
          setUser(userResponse.user);
          
          // Load courses
          await loadCourses();
          
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
          alert(`Failed to connect Canvas: ${error.message || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Canvas callback error:', error);
        alert('Failed to connect Canvas. Please try again.');
      }
    }
  };

  const loadCourses = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch('http://localhost:3000/api/canvas/courses', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCourses(data.courses || []);
      } else if (response.status === 400) {
        // Canvas not connected - this is OK
        setCourses([]);
      }
    } catch (error) {
      console.error('Failed to load courses:', error);
      setCourses([]);
    }
  };

  const handleLogin = async (email, password) => {
    try {
      const response = await authAPI.login(email, password);
      setAuthToken(response.token);
      setUser(response.user);
      setIsAuthenticated(true);
      await loadCourses();
    } catch (error) {
      throw error;
    }
  };

  const handleRegister = async (userData) => {
    // User is already registered and logged in via the Login component
    setUser(userData);
    setIsAuthenticated(true);
    await loadCourses();
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setAuthToken(null);
    setIsAuthenticated(false);
    setUser(null);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} onRegister={handleRegister} />;
  }

  return (
    <div className="app-container">
      <TopBar 
        courses={courses}
        selectedCourse={selectedCourse}
        onCourseSelect={setSelectedCourse}
        user={user}
        onLogout={handleLogout}
        onCanvasConnect={async () => {
          // Refresh user data after Canvas connection
          const userResponse = await authAPI.getMe();
          setUser(userResponse.user);
          await loadCourses();
          // Trigger Dashboard refresh
          setDashboardRefreshKey(prev => prev + 1);
        }}
      />
      <div className="main-layout">
        <Sidebar 
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
        <main className="main-content">
          {currentPage === 'dashboard' && (
            <Dashboard 
              key={dashboardRefreshKey} 
              selectedCourse={selectedCourse}
              onNavigateToPage={setCurrentPage}
              courses={courses}
              onCourseSelect={setSelectedCourse}
            />
          )}
          {currentPage === 'notes' && (
            <Notes selectedCourse={selectedCourse} />
          )}
          {currentPage === 'cheatsheets' && (
            <Cheatsheets selectedCourse={selectedCourse} />
          )}
          {currentPage === 'chunking' && (
            <AssignmentChunking selectedCourse={selectedCourse} />
          )}
          {currentPage === 'attention' && (
            <AttentionCheck />
          )}
        </main>
        <PomodoroWidget />
      </div>
    </div>
  );
}

export default App;

