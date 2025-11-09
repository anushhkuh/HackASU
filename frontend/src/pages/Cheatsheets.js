import React, { useState, useEffect } from 'react';
import './Cheatsheets.css';
import apiClient from '../utils/apiClient';

const Cheatsheets = ({ selectedCourse }) => {
  const [cheatsheets, setCheatsheets] = useState([]);
  const [selectedCheatsheet, setSelectedCheatsheet] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCheatsheets();
  }, [selectedCourse]);

  const loadCheatsheets = async () => {
    try {
      setLoading(true);
      const params = selectedCourse 
        ? `?type=cheatsheet&courseId=${selectedCourse.id}` 
        : '?type=cheatsheet';
      const response = await apiClient.get(`/api/notes${params}`);
      setCheatsheets(response.notes || []);
    } catch (error) {
      console.error('Failed to load cheatsheets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    try {
      const noteData = {
        title,
        content,
        type: 'cheatsheet',
        courseId: selectedCourse?.id?.toString(),
        courseName: selectedCourse?.name,
      };

      if (selectedCheatsheet) {
        await apiClient.put(`/api/notes/${selectedCheatsheet.id}`, noteData);
      } else {
        await apiClient.post('/api/notes', noteData);
      }

      setTitle('');
      setContent('');
      setSelectedCheatsheet(null);
      await loadCheatsheets();
    } catch (error) {
      console.error('Failed to save cheatsheet:', error);
      alert('Failed to save cheatsheet. Please try again.');
    }
  };

  const handleSelectCheatsheet = (cheatsheet) => {
    setSelectedCheatsheet(cheatsheet);
    setTitle(cheatsheet.title);
    setContent(cheatsheet.content);
  };

  const handleNewCheatsheet = async () => {
    try {
      const response = await apiClient.get('/api/notes/templates/cheatsheet');
      setSelectedCheatsheet(null);
      setTitle(response.template.title);
      setContent(response.template.content);
    } catch (error) {
      setTitle('New Cheatsheet');
      setContent('# Cheatsheet: [Topic]\n\n## Key Formulas\n- \n- \n\n## Important Definitions\n- \n- \n');
    }
  };

  if (loading) {
    return <div className="loading">Loading cheatsheets...</div>;
  }

  return (
    <div className="cheatsheets-page">
      <div className="cheatsheets-header">
        <h1>Exam Cheatsheets</h1>
        <button className="btn btn-primary" onClick={handleNewCheatsheet}>
          + New Cheatsheet
        </button>
      </div>

      <div className="cheatsheets-layout">
        <div className="cheatsheets-sidebar">
          <h3>Your Cheatsheets ({cheatsheets.length})</h3>
          <div className="cheatsheets-list">
            {cheatsheets.map((cs) => (
              <div
                key={cs.id}
                className={`cheatsheet-item ${selectedCheatsheet?.id === cs.id ? 'active' : ''}`}
                onClick={() => handleSelectCheatsheet(cs)}
              >
                <h4>{cs.title}</h4>
                {cs.courseName && (
                  <span className="course-badge">{cs.courseName}</span>
                )}
              </div>
            ))}
            {cheatsheets.length === 0 && (
              <p className="empty-state">No cheatsheets yet. Create your first one!</p>
            )}
          </div>
        </div>

        <div className="cheatsheet-editor">
          <input
            type="text"
            className="input"
            placeholder="Cheatsheet title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ marginBottom: 'var(--spacing-md)' }}
          />
          <textarea
            className="textarea cheatsheet-textarea"
            placeholder="Create your exam cheatsheet here... Use markdown for formatting!"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="editor-actions">
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={!title.trim()}
            >
              {selectedCheatsheet ? 'Update' : 'Save'} Cheatsheet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cheatsheets;

