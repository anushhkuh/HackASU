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

  useEffect(() => {
    loadNotes();
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

  if (loading) {
    return <div className="loading">Loading notes...</div>;
  }

  return (
    <div className="notes-page">
      <div className="notes-header">
        <h1>My Notes</h1>
        <button className="btn btn-primary" onClick={handleNewNote}>
          + New Note
        </button>
      </div>

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

