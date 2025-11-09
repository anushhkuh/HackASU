import React, { useState, useEffect } from 'react';
import './AssignmentChunking.css';
import apiClient from '../utils/apiClient';

const AssignmentChunking = ({ selectedCourse }) => {
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [chunkDuration, setChunkDuration] = useState(25);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssignments();
  }, [selectedCourse]);

  useEffect(() => {
    if (selectedAssignment) {
      loadChunks();
    }
  }, [selectedAssignment]);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      const params = selectedCourse 
        ? `?courseId=${selectedCourse.id}` 
        : '';
      const response = await apiClient.get(`/api/assignments${params}`);
      setAssignments(response.assignments || []);
    } catch (error) {
      console.error('Failed to load assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChunks = async () => {
    if (!selectedAssignment) return;
    
    try {
      const response = await apiClient.get(`/api/assignments/${selectedAssignment.id}`);
      setChunks(response.assignment.chunks || []);
    } catch (error) {
      console.error('Failed to load chunks:', error);
    }
  };

  const handleAutoGenerate = async () => {
    if (!selectedAssignment || !selectedAssignment.expectedDuration) {
      alert('Assignment must have an expected duration to auto-generate chunks.');
      return;
    }

    try {
      const response = await apiClient.post(
        `/api/assignments/${selectedAssignment.id}/chunks/auto`,
        { chunkDuration }
      );
      setChunks(response.chunks || []);
      await loadChunks();
    } catch (error) {
      console.error('Failed to generate chunks:', error);
      alert('Failed to generate chunks. Please try again.');
    }
  };

  const handleChunkToggle = async (chunkId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
      await apiClient.patch(`/api/assignments/chunks/${chunkId}`, { status: newStatus });
      await loadChunks();
    } catch (error) {
      console.error('Failed to update chunk:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading assignments...</div>;
  }

  return (
    <div className="chunking-page">
      <div className="chunking-header">
        <h1>Assignment Chunking</h1>
        <p className="subtitle">Break down large assignments into manageable pieces</p>
      </div>

      <div className="chunking-layout">
        <div className="assignments-panel">
          <h3>Select Assignment</h3>
          <div className="assignments-list">
            {assignments
              .filter(a => a.status !== 'completed')
              .map((assignment) => (
                <div
                  key={assignment.id}
                  className={`assignment-item ${selectedAssignment?.id === assignment.id ? 'active' : ''}`}
                  onClick={() => setSelectedAssignment(assignment)}
                >
                  <h4>{assignment.title}</h4>
                  <div className="assignment-meta">
                    {assignment.expectedDuration && (
                      <span>⏱️ {Math.round(assignment.expectedDuration / 60)} hours</span>
                    )}
                    {assignment.dueDate && (
                      <span>📅 {new Date(assignment.dueDate).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              ))}
            {assignments.filter(a => a.status !== 'completed').length === 0 && (
              <p className="empty-state">No pending assignments to chunk!</p>
            )}
          </div>
        </div>

        <div className="chunks-panel">
          {selectedAssignment ? (
            <>
              <div className="chunks-header">
                <h3>{selectedAssignment.title}</h3>
                <div className="chunk-controls">
                  <input
                    type="number"
                    className="input chunk-duration-input"
                    value={chunkDuration}
                    onChange={(e) => setChunkDuration(parseInt(e.target.value) || 25)}
                    min="5"
                    max="60"
                    style={{ width: '80px' }}
                  />
                  <span>minutes per chunk</span>
                  <button
                    className="btn btn-primary"
                    onClick={handleAutoGenerate}
                    disabled={!selectedAssignment.expectedDuration}
                  >
                    Auto-Generate Chunks
                  </button>
                </div>
              </div>

              {chunks.length > 0 ? (
                <div className="chunks-list">
                  {chunks.map((chunk, index) => (
                    <div
                      key={chunk.id}
                      className={`chunk-item ${chunk.status === 'completed' ? 'completed' : ''}`}
                    >
                      <div className="chunk-header">
                        <div className="chunk-number">{index + 1}</div>
                        <div className="chunk-info">
                          <h4>{chunk.title}</h4>
                          <span className="chunk-duration">⏱️ {chunk.duration} minutes</span>
                        </div>
                        <button
                          className={`chunk-toggle ${chunk.status === 'completed' ? 'checked' : ''}`}
                          onClick={() => handleChunkToggle(chunk.id, chunk.status)}
                        >
                          {chunk.status === 'completed' ? '✓' : '○'}
                        </button>
                      </div>
                      {chunk.description && (
                        <p className="chunk-description">{chunk.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-chunks">
                  <p>No chunks created yet. Click "Auto-Generate Chunks" to break down this assignment!</p>
                </div>
              )}
            </>
          ) : (
            <div className="no-selection">
              <p>Select an assignment from the list to view and manage its chunks.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssignmentChunking;

