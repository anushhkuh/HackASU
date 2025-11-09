import React, { useState, useEffect } from 'react';
import PomodoroTimer from './Pomodoro.js';
import Dashboard from './Dashboard.js';
import StudyPlan from './StudyPlan.js';
import apiClient from './apiClient';
import './App.css';

const initialAssignments = [
  { 
    id: 'a1',
    name: "Math Homework", 
    due: "2025-11-09", 
    duration: 2,
    totalChunks: 4,
    completedChunks: 1,
    completedDates: [],
    subject: 'Math'
  },
  { 
    id: 'a2',
    name: "History Essay", 
    due: "2025-11-12", 
    duration: 3,
    totalChunks: 6,
    completedChunks: 0,
    completedDates: [],
    subject: 'History'
  }
];

function App() {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [selectedSubject, setSelectedSubject] = useState('All');
  const [useBackend, setUseBackend] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check if backend is available and load assignments on mount
  useEffect(() => {
    const loadAssignmentsFromBackend = async () => {
      try {
        setLoading(true);
        const backendAssignments = await apiClient.assignmentsAPI.getAll();
        if (Array.isArray(backendAssignments) && backendAssignments.length > 0) {
          setAssignments(backendAssignments);
          setUseBackend(true);
        }
      } catch (error) {
        console.log('Backend not available, using local state:', error.message);
        setUseBackend(false);
      } finally {
        setLoading(false);
      }
    };

    // Only try to load from backend if API_BASE_URL is configured
    if (process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_USE_BACKEND === 'true') {
      loadAssignmentsFromBackend();
    }
  }, []);

  const handleAddAssignment = async (newAssignment) => {
    // Normalize incoming assignment values to consistent types
    const normalized = {
      id: `id-${Date.now()}-${Math.floor(Math.random()*10000)}`,
      name: newAssignment.name || 'Untitled',
      due: newAssignment.due || new Date().toISOString().slice(0,10),
      // keep duration as number of hours
      duration: parseFloat(newAssignment.duration) || 0,
      totalChunks: parseInt(newAssignment.totalChunks, 10) || 1,
      completedChunks: 0,
      // optional dailyHours can be added by user later; default to 2
      dailyHours: newAssignment.dailyHours || 2,
      subject: newAssignment.subject || 'General',
      completedDates: []
    };

    // Try to save to backend if available
    if (useBackend) {
      try {
        const saved = await apiClient.assignmentsAPI.create(normalized);
        setAssignments([...assignments, saved]);
        return;
      } catch (error) {
        console.error('Failed to save to backend, using local state:', error);
      }
    }

    // Fallback to local state
    setAssignments([...assignments, normalized]);
  };

  // derive list of subjects from assignments (support subject arrays)
  const subjects = Array.from(new Set(assignments.flatMap(a => Array.isArray(a.subject) ? a.subject : [a.subject || 'General']))).filter(Boolean);

  const filteredAssignments = selectedSubject === 'All'
    ? assignments
    : assignments.filter(a => {
      if (Array.isArray(a.subject)) return a.subject.includes(selectedSubject);
      return (a.subject || 'General') === selectedSubject;
    });

  const handleUpdateAssignment = async (updatedAssignment) => {
    // Try to update in backend if available
    if (useBackend) {
      try {
        const saved = await apiClient.assignmentsAPI.update(updatedAssignment.id, updatedAssignment);
        setAssignments(assignments.map(a => 
          a.id === updatedAssignment.id ? saved : a
        ));
        return;
      } catch (error) {
        console.error('Failed to update in backend, using local state:', error);
      }
    }

    // Fallback to local state
    setAssignments(assignments.map(a => 
      a.id === updatedAssignment.id ? updatedAssignment : a
    ));
  };

  const handleToggleChunk = async (assignmentId, chunkIndex) => {
    const updated = assignments.map(a => {
      if (a.id !== assignmentId) return a;
      const copy = { ...a };
      const today = new Date().toISOString().slice(0,10);
      // ensure completedDates exists
      copy.completedDates = Array.isArray(copy.completedDates) ? [...copy.completedDates] : [];

      if ((copy.completedChunks || 0) > chunkIndex) {
        // un-complete: reduce completedChunks and trim dates
        copy.completedChunks = chunkIndex;
        copy.completedDates = copy.completedDates.slice(0, chunkIndex);
      } else {
        // complete up to chunkIndex
        copy.completedChunks = chunkIndex + 1;
        // ensure dates array length matches completedChunks
        for (let i = copy.completedDates.length; i < copy.completedChunks; i++) {
          copy.completedDates[i] = today;
        }
      }

      return copy;
    });

    // Update local state immediately for responsive UI
    setAssignments(updated);

    // Try to sync with backend if available
    const assignment = updated.find(a => a.id === assignmentId);
    if (useBackend && assignment) {
      try {
        await apiClient.assignmentsAPI.update(assignmentId, assignment);
      } catch (error) {
        console.error('Failed to sync chunk update to backend:', error);
      }
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    // Try to delete from backend if available
    if (useBackend) {
      try {
        await apiClient.assignmentsAPI.delete(assignmentId);
      } catch (error) {
        console.error('Failed to delete from backend, using local state:', error);
      }
    }

    // Update local state
    setAssignments((prev) => prev.filter(a => a.id !== assignmentId));
  };

  return (
    <div className="App">
      <header>
        <h1>Focus Pocus Dashboard</h1>
      </header>
      <main>
        <div className="tabs">
          <button
            className={`tab ${selectedSubject === 'All' ? 'active' : ''}`}
            onClick={() => setSelectedSubject('All')}
          >
            All
          </button>
          {subjects.map((s) => (
            <button
              key={s}
              className={`tab ${selectedSubject === s ? 'active' : ''}`}
              onClick={() => setSelectedSubject(s)}
            >
              {s}
            </button>
          ))}
        </div>

        <Dashboard 
          assignments={filteredAssignments}
          onUpdateAssignment={handleUpdateAssignment}
          onToggleChunk={handleToggleChunk}
          onDeleteAssignment={handleDeleteAssignment}
          allAssignments={assignments}
        />
        <StudyPlan
          assignments={assignments}
          subjects={['General', ...subjects]}
          defaultSubject={selectedSubject === 'All' ? 'General' : selectedSubject}
          onAddAssignment={handleAddAssignment}
          onUpdateAssignment={handleUpdateAssignment}
        />
      </main>
      {/* Render Pomodoro outside main content for proper layering */}
      <PomodoroTimer />
      <section className="notes">
        <h2>Notes</h2>
        <textarea placeholder="Take notes here..."></textarea>
      </section>
      <footer>
        <small>Gamified badges & reminders coming soon!</small>
      </footer>
    </div>
  );
}

export default App;