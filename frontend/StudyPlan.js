import React, { useState } from 'react';
import './StudyPlan.css';
import canvas from './canvasClient';

function StudyPlan({ assignments, subjects = ['General'], defaultSubject = 'General', onAddAssignment, onUpdateAssignment }) {
  const [newAssignment, setNewAssignment] = useState({
    name: '',
    due: '',
    // store duration as a number (hours)
    duration: 0,
    totalChunks: 1,
    completedChunks: 0,
    // subject as a simple text field (comma-separated allowed)
    subject: defaultSubject || (subjects && subjects[0]) || 'General'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // ensure subject is present
    const payload = {
      ...newAssignment,
      // allow user to input comma-separated subjects in a single text box
      subject: (typeof newAssignment.subject === 'string'
        ? newAssignment.subject.split(',').map(s => s.trim()).filter(Boolean)
        : Array.isArray(newAssignment.subject) ? newAssignment.subject : [defaultSubject || 'General'])
    };
    onAddAssignment(payload);
    setNewAssignment({
      name: '',
      due: '',
      duration: 0,
      totalChunks: 1,
      completedChunks: 0,
      subject: defaultSubject || (subjects && subjects[0]) || 'General'
    });
  };

  const suggestChunks = (duration) => {
    // Suggest chunks based on duration (e.g., 1 chunk per 30 minutes)
    const hours = parseFloat(duration);
    return Math.max(1, Math.ceil((hours * 60) / 30));
  };

  // Canvas import modal state
  const [importOpen, setImportOpen] = useState(false);
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [courseAssignments, setCourseAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [selectedToImport, setSelectedToImport] = useState(new Set());
  const [importError, setImportError] = useState(null);
  const [importBaseUrl, setImportBaseUrl] = useState('');
  // Pre-populate with the provided Canvas LMS token
  const [importToken, setImportToken] = useState('7~FHwUrvNnGvYG86hVkG8ehLz2Crzuz4aAGHBLA8wB9zRrP2vuneJmTRQFnGaM9Bw8');

  const openImport = async () => {
    setImportOpen(true);
    setImportError(null);
    // preload known base url if present
    try {
      const cfg = canvas.getConfig ? canvas.getConfig() : {};
      if (cfg && cfg.baseUrl) setImportBaseUrl(cfg.baseUrl);
      // Also pre-populate token if available in config
      if (cfg && cfg.token) setImportToken(cfg.token);
    } catch (e) {
      // ignore
    }
    // if client already has baseUrl and token, load courses immediately
    try {
      if (canvas.hasToken && canvas.hasToken() && (canvas.getConfig && canvas.getConfig().baseUrl)) {
        await loadCourses();
      }
    } catch (err) {
      console.error('Error loading Canvas courses', err);
      setImportError('Failed to load courses. Check token and base URL.');
    }
  };

  const loadCourses = async () => {
    setLoadingCourses(true);
    setImportError(null);
    try {
      const cs = await canvas.getCourses();
      setCourses(Array.isArray(cs) ? cs : []);
    } catch (err) {
      console.error('Error loading Canvas courses', err);
      setImportError('Failed to load courses. Check token and base URL.');
      setCourses([]);
    } finally {
      setLoadingCourses(false);
    }
  };

  const loadAssignmentsForCourse = async (courseId) => {
    setSelectedCourseId(courseId);
    setLoadingAssignments(true);
    setCourseAssignments([]);
    setSelectedToImport(new Set());
    setImportError(null);
    try {
      const as = await canvas.getAssignmentsForCourse(courseId);
      setCourseAssignments(Array.isArray(as) ? as : []);
    } catch (err) {
      console.error('Error loading assignments', err);
      setImportError('Failed to load assignments for this course.');
    } finally {
      setLoadingAssignments(false);
    }
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedToImport);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedToImport(next);
  };

  const importSelected = async () => {
    if (!selectedCourseId) return;
    const course = courses.find(c => String(c.id) === String(selectedCourseId));
    // map and add each selected assignment
    const toImport = courseAssignments.filter(a => selectedToImport.has(String(a.id)));
    toImport.forEach(a => {
      const payload = {
        name: a.name || a.title || 'Untitled',
        due: a.due_at ? a.due_at.slice(0,10) : '',
        duration: 1, // default to 1 hour; user can edit later
        totalChunks: suggestChunks(1),
        subject: course ? course.name : (defaultSubject || 'General')
      };
      onAddAssignment(payload);
    });
    setImportOpen(false);
  };

  // detect whether client is configured or proxy is enabled
  const proxyMode = (canvas && canvas.isProxyEnabled) ? canvas.isProxyEnabled() : false;
  const clientConfigured = proxyMode || (canvas && canvas.hasToken && canvas.hasToken() && canvas.getConfig && canvas.getConfig().baseUrl);

  return (
    <div className="study-plan">
      <h2>Create Study Plan</h2>
      <div style={{ marginBottom: 12 }}>
        <button type="button" className="import-btn" onClick={openImport}>Import from Canvas</button>
      </div>
      <form onSubmit={handleSubmit} className="assignment-form">
        <div className="form-group">
          <label>Assignment Name:</label>
          <input
            type="text"
            value={newAssignment.name}
            onChange={(e) => setNewAssignment({
              ...newAssignment,
              name: e.target.value
            })}
            required
          />
        </div>

        <div className="form-group">
          <label>Due Date:</label>
          <input
            type="date"
            value={newAssignment.due}
            onChange={(e) => setNewAssignment({
              ...newAssignment,
              due: e.target.value
            })}
            required
          />
        </div>

        <div className="form-group">
          <label>Estimated Duration (hours):</label>
          <input
            type="number"
            step="0.5"
            value={newAssignment.duration}
            onChange={(e) => {
              const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
              setNewAssignment({
                ...newAssignment,
                duration: val,
                totalChunks: suggestChunks(val)
              });
            }}
            required
          />
        </div>

        <div className="form-group">
          <label>Number of Study Chunks:</label>
          <input
            type="number"
            min="1"
            value={newAssignment.totalChunks}
            onChange={(e) => setNewAssignment({
              ...newAssignment,
              totalChunks: parseInt(e.target.value, 10) || 1
            })}
            required
          />
        </div>

        <div className="form-group">
          <label>Subject(s):</label>
          <input
            type="text"
            placeholder="e.g. Math, Physics"
            value={newAssignment.subject}
            onChange={(e) => setNewAssignment({ ...newAssignment, subject: e.target.value })}
          />
          <small style={{ color: '#666' }}>Enter one or more subjects, separated by commas.</small>
        </div>

        <button type="submit" className="submit-btn">Add Assignment</button>
      </form>
      {/* Canvas import modal */}
      {importOpen && (
        <div className="modal-backdrop" onClick={() => setImportOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Import Assignments from Canvas</h3>
            {importError && <div style={{ color: 'red' }}>{importError}</div>}
            {/* If the client is not configured with base URL and token and proxy not enabled, show session config inputs */}
            {(!clientConfigured) ? (
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ color: '#666' }}>Canvas token or base URL not detected. You can either set <code>REACT_APP_CANVAS_BASE_URL</code> and <code>REACT_APP_CANVAS_TOKEN</code> in a local <code>.env.local</code> file, or paste a token and base URL here for this session.</div>
                <div>
                  <label>Canvas Base URL (e.g. https://your-institution.instructure.com)</label>
                  <input type="text" value={importBaseUrl} onChange={(e) => setImportBaseUrl(e.target.value)} style={{ width: '100%' }} placeholder="https://your-instance.instructure.com" />
                </div>
                <div>
                  <label>Access Token (session only)</label>
                  <input type="password" value={importToken} onChange={(e) => setImportToken(e.target.value)} style={{ width: '100%' }} placeholder="Paste Canvas token (kept in memory only)" />
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button className="modal-button secondary" onClick={() => setImportOpen(false)}>Cancel</button>
                  <button className="modal-button primary" onClick={async () => {
                    // set client config for this session and load courses or a specific course
                    try {
                      if (!importBaseUrl) {
                        setImportError('Please enter a Canvas base URL or a course URL.');
                        return;
                      }
                      if (!importToken) {
                        setImportError('Please enter a Canvas access token.');
                        return;
                      }

                      // Normalize the provided URL: if user pasted a course URL, extract origin and courseId
                      let normalizedBase = importBaseUrl.trim();
                      let maybeCourseId = null;
                      try {
                        const u = new URL(normalizedBase);
                        // If the path contains /courses/<id>, capture it
                        const match = u.pathname.match(/\/courses\/(\d+)/);
                        if (match) {
                          maybeCourseId = match[1];
                        }
                        normalizedBase = u.origin; // use origin as base URL
                      } catch (parseErr) {
                        // not a full URL — keep as-is
                      }

                      canvas.setConfig({ baseUrl: normalizedBase, token: importToken });

                      if (maybeCourseId) {
                        // Load assignments directly for the course ID found in URL
                        setLoadingAssignments(true);
                        setCourseAssignments([]);
                        setSelectedToImport(new Set());
                        try {
                          // First, try to get course info
                          const courseInfo = await canvas.getCourses();
                          const foundCourse = Array.isArray(courseInfo) 
                            ? courseInfo.find(c => String(c.id) === String(maybeCourseId))
                            : null;
                          
                          if (foundCourse) {
                            setCourses([foundCourse]);
                            setSelectedCourseId(String(maybeCourseId));
                          } else {
                            // If course not in list, create a placeholder
                            setCourses([{ id: maybeCourseId, name: `Course ${maybeCourseId}` }]);
                            setSelectedCourseId(String(maybeCourseId));
                          }
                          
                          // Load assignments for this course
                          const assignments = await canvas.getAssignmentsForCourse(maybeCourseId);
                          setCourseAssignments(Array.isArray(assignments) ? assignments : []);
                        } catch (err) {
                          console.error('Error loading assignments for provided course', err);
                          setImportError(`Failed to load assignments for course ${maybeCourseId}. ${err.message || 'Check token and course ID.'}`);
                        } finally {
                          setLoadingAssignments(false);
                        }
                      } else {
                        // no course in URL — load user's courses
                        await loadCourses();
                      }
                    } catch (err) {
                      console.error(err);
                      setImportError('Failed to configure or load courses. Check values and CORS.');
                    }
                  }}>Use for session & load courses</button>
                </div>
              </div>
            ) : (
              (loadingCourses ? (
                <div>Loading courses…</div>
              ) : (
                <div>
                  <label>Choose course:</label>
                  <select value={selectedCourseId || ''} onChange={(e) => loadAssignmentsForCourse(e.target.value)} style={{ width: '100%', marginBottom: 8 }}>
                    <option value="">-- select a course --</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>

                  {loadingAssignments ? <div>Loading assignments…</div> : (
                    <div style={{ maxHeight: 260, overflow: 'auto', border: '1px solid #eee', padding: 8 }}>
                      {courseAssignments.length === 0 ? <div style={{ color: '#666' }}>No assignments found.</div> : (
                        courseAssignments.map(a => (
                          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid #fafafa' }}>
                            <input type="checkbox" checked={selectedToImport.has(String(a.id))} onChange={() => toggleSelect(String(a.id))} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600 }}>{a.name || a.title}</div>
                              <div style={{ fontSize: 12, color: '#666' }}>{a.due_at ? a.due_at.slice(0,10) : 'No due date'}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                    <button className="modal-button secondary" onClick={() => setImportOpen(false)}>Cancel</button>
                    <button className="modal-button primary" onClick={importSelected} disabled={selectedToImport.size === 0}>Import Selected</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyPlan;