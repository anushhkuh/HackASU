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

  useEffect(() => {
    checkAuth();
    loadCourses();
  }, []);

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

  const loadCourses = async () => {
    try {
      const response = await fetch('/api/canvas/courses', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setCourses(data.courses || []);
      }
    } catch (error) {
      console.error('Failed to load courses:', error);
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
      />
      <div className="main-layout">
        <Sidebar 
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
        <main className="main-content">
          {currentPage === 'dashboard' && (
            <Dashboard selectedCourse={selectedCourse} />
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

