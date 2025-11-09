import React, { useState, useEffect } from 'react';
import './Notes.css';
import apiClient from '../utils/apiClient';

const Notes = ({ selectedCourse }) => {
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [noteType, setNoteType] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canvasFiles, setCanvasFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [summarizing, setSummarizing] = useState(false);

  useEffect(() => {
    loadNotes();
    loadCanvasFiles();
  }, [selectedCourse]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const params = selectedCourse 
        ? `?courseId=${selectedCourse.id}` 
        : '';
      const response = await apiClient.get(`/api/notes${params}`);
      setNotes(response.notes || []);
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) return;

    try {
      setSaving(true);
      const noteData = {
        title,
        content,
        type: noteType,
        courseId: selectedCourse?.id?.toString(),
        courseName: selectedCourse?.name,
      };

      if (selectedNote) {
        await apiClient.put(`/api/notes/${selectedNote.id}`, noteData);
      } else {
        await apiClient.post('/api/notes', noteData);
      }

      setTitle('');
      setContent('');
      setSelectedNote(null);
      await loadNotes();
    } catch (error) {
      console.error('Failed to save note:', error);
      alert('Failed to save note. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;

    try {
      await apiClient.delete(`/api/notes/${noteId}`);
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
        setTitle('');
        setContent('');
      }
      await loadNotes();
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const handleSelectNote = (note) => {
    setSelectedNote(note);
    setTitle(note.title);
    setContent(note.content);
    setNoteType(note.type);
  };

  const handleNewNote = () => {
    setSelectedNote(null);
    setTitle('');
    setContent('');
    setNoteType('general');
  };

  const loadCanvasFiles = async () => {
    try {
      setLoadingFiles(true);
      const endpoint = selectedCourse 
        ? `/api/canvas/files/${selectedCourse.id}`
        : '/api/canvas/files';
      const response = await apiClient.get(endpoint);
      setCanvasFiles(response.files || []);
    } catch (error) {
      console.error('Failed to load Canvas files:', error);
      // If Canvas not connected, that's OK
      setCanvasFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleSummarizePDF = async (file) => {
    if (!window.confirm(`Summarize "${file.filename || file.display_name}" with Gemini AI?`)) {
      return;
    }

    try {
      setSummarizing(true);
      console.log('📄 Starting PDF summarization:', {
        fileId: file.id,
        fileName: file.filename || file.display_name,
        courseId: file.courseId || selectedCourse?.id,
        courseName: file.courseName || selectedCourse?.name,
      });

      const response = await apiClient.post('/api/gemini/summarize-pdf', {
        fileId: file.id,
        courseId: file.courseId || selectedCourse?.id,
        courseName: file.courseName || selectedCourse?.name,
      });

      console.log('✅ PDF summarization response:', response);

      if (response.success) {
        alert('PDF summarized successfully! The summary has been saved as a note.');
        
        // Load notes to show the new summary
        await loadNotes();
        
        // Select the newly created note
        if (response.note) {
          const newNote = await apiClient.get(`/api/notes/${response.note.id}`);
          handleSelectNote(newNote.note);
        }
      }
    } catch (error) {
      console.error('❌ Failed to summarize PDF:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        data: error.data,
        stack: error.stack,
      });
      
      const errorMessage = error.message || error.error || error.data?.error || 'Failed to summarize PDF. Please try again.';
      alert(`Error: ${errorMessage}\n\nMake sure:\n1. Backend server is running on port 3000\n2. GEMINI_API_KEY is set in .env\n3. Canvas is connected\n\nCheck the browser console (F12) for more details.`);
    } finally {
      setSummarizing(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading notes...</div>;
  }

  return (
    <div className="notes-page">
      <div className="notes-header">
        <h1>My Notes</h1>
        <div className="notes-header-actions">
          <button 
            className="btn btn-secondary" 
            onClick={loadCanvasFiles}
            disabled={loadingFiles}
            title="Refresh Canvas files"
          >
            {loadingFiles ? '⏳ Loading...' : '🔄 Refresh Canvas Files'}
          </button>
          <button className="btn btn-primary" onClick={handleNewNote}>
            + New Note
          </button>
        </div>
      </div>

      {/* Canvas PDF Files Section */}
      {canvasFiles.length > 0 && (
        <div className="canvas-files-section">
          <h3>📄 PDF Files from Canvas</h3>
          <p className="canvas-files-description">
            Click "Summarize" to generate AI-powered notes from PDF files using Gemini
          </p>
          <div className="canvas-files-list">
            {canvasFiles.map((file) => (
              <div key={file.id} className="canvas-file-item">
                <div className="file-info">
                  <span className="file-icon">📄</span>
                  <div className="file-details">
                    <h4>{file.filename || file.display_name}</h4>
                    <p className="file-meta">
                      {file.courseName || selectedCourse?.name || 'Unknown Course'}
                      {file.size && ` • ${(file.size / 1024).toFixed(1)} KB`}
                    </p>
                  </div>
                </div>
                <button
                  className="btn btn-primary btn-small"
                  onClick={() => handleSummarizePDF(file)}
                  disabled={summarizing}
                >
                  {summarizing ? '⏳ Summarizing...' : '✨ Summarize with Gemini'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="notes-layout">
        <div className="notes-sidebar">
          <h3>Your Notes ({notes.length})</h3>
          <div className="notes-list">
            {notes.map((note) => (
              <div
                key={note.id}
                className={`note-item ${selectedNote?.id === note.id ? 'active' : ''}`}
                onClick={() => handleSelectNote(note)}
              >
                <div className="note-item-header">
                  <h4>{note.title}</h4>
                  <span className="note-type-badge">{note.type}</span>
                </div>
                <p className="note-preview">
                  {note.content.substring(0, 60)}...
                </p>
                <div className="note-item-actions">
                  <button
                    className="delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(note.id);
                    }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
            {notes.length === 0 && (
              <p className="empty-notes">No notes yet. Create your first note!</p>
            )}
          </div>
        </div>

        <div className="notes-editor">
          <div className="editor-header">
            <select
              className="input"
              value={noteType}
              onChange={(e) => setNoteType(e.target.value)}
              style={{ width: 'auto', marginRight: 'auto' }}
            >
              <option value="general">General Note</option>
              <option value="lecture">Lecture Notes</option>
              <option value="cheatsheet">Cheatsheet</option>
              <option value="assignment">Assignment Notes</option>
            </select>
          </div>
          <input
            type="text"
            className="input"
            placeholder="Note title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ marginBottom: 'var(--spacing-md)' }}
          />
          <textarea
            className="textarea notes-textarea"
            placeholder="Start writing your notes here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="editor-actions">
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving || !title.trim()}
            >
              {saving ? 'Saving...' : selectedNote ? 'Update Note' : 'Save Note'}
            </button>
            {selectedNote && (
              <button
                className="btn btn-secondary"
                onClick={handleNewNote}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notes;

