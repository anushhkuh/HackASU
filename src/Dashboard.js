import React, { useState } from 'react';
import './Dashboard.css';

function Dashboard({ assignments, onUpdateAssignment, onToggleChunk, allAssignments, onDeleteAssignment }) {
  const calculateProgress = (assignment) => {
    return (assignment.completedChunks / (assignment.totalChunks || 1)) * 100 || 0;
  };
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, name } when showing dialog

  const getEstimatedHours = (assignment) => {
    // assignment.duration stores hours (number) — fall back to parseFloat if needed
    const hrs = typeof assignment.duration === 'number' ? assignment.duration : parseFloat(assignment.duration) || 0;
    return hrs;
  };

  const getEstimatedDays = (assignment) => {
    const hrs = getEstimatedHours(assignment);
    const daily = assignment.dailyHours || 2; // default study capacity per day
    return Math.max(1, Math.ceil(hrs / daily));
  };

  const daysUntilDue = (assignment) => {
    if (!assignment.due) return Infinity;
    const dueDate = new Date(assignment.due);
    const now = new Date();
    const diffMs = dueDate.setHours(0,0,0,0) - new Date(now).setHours(0,0,0,0);
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  // Streak helpers: collect all completion dates across assignments
  const allCompletionDateStrings = () => {
    const set = new Set();
    const source = allAssignments || assignments || [];
    source.forEach(a => {
      (a.completedDates || []).forEach(d => {
        if (!d) return;
        // normalize to YYYY-MM-DD
        const s = new Date(d).toISOString().slice(0,10);
        set.add(s);
      });
    });
    return Array.from(set);
  };

  const calculateStreaks = () => {
    const dateStrs = allCompletionDateStrings();
    if (dateStrs.length === 0) return { current: 0, best: 0 };

    // convert to day numbers (days since epoch)
    const dayNums = dateStrs.map(s => Math.floor(new Date(s).setHours(0,0,0,0) / 86400000));
    const daySet = new Set(dayNums);

    // best streak: find longest consecutive sequence
    let best = 0;
    dayNums.forEach(num => {
      if (daySet.has(num - 1)) return; // only start at sequence heads
      let length = 0;
      let cur = num;
      while (daySet.has(cur)) {
        length++;
        cur++;
      }
      if (length > best) best = length;
    });

    // current streak: count back from today
    const todayNum = Math.floor(new Date().setHours(0,0,0,0) / 86400000);
    let current = 0;
    let day = todayNum;
    while (daySet.has(day)) {
      current++;
      day--;
    }

    return { current, best };
  };

  // ------------------ Heatmap helpers ------------------
  const buildCountsMap = () => {
    // Map YYYY-MM-DD -> count of completions that day
    const map = new Map();
    // Use only the currently visible (filtered) assignments for the heatmap
    const source = assignments || [];
    source.forEach(a => {
      (a.completedDates || []).forEach(d => {
        if (!d) return;
        const s = new Date(d).toISOString().slice(0,10);
        map.set(s, (map.get(s) || 0) + 1);
      });
    });
    return map;
  };

  const colorForCount = (count, max) => {
    // simple 5-level scale (0..4) based on max
    if (!count || count <= 0) return '#ebedf0';
    const thresholds = [0.25, 0.5, 0.75, 1];
    const ratio = max > 0 ? count / max : 0;
    if (ratio <= thresholds[0]) return '#c6e48b';
    if (ratio <= thresholds[1]) return '#7bc96f';
    if (ratio <= thresholds[2]) return '#239a3b';
    return '#196127';
  };

  const buildHeatmapWeeks = (weeks = 53) => {
    const counts = buildCountsMap();
    // compute max count to scale colors
    let max = 0;
    for (const v of counts.values()) if (v > max) max = v;

    const days = [];
  const today = new Date();
  // align start to Sunday of (weeks*7 - 1) days ago so weeks line up Sunday->Saturday
  const totalDays = weeks * 7;
  const start = new Date();
  start.setDate(today.getDate() - (totalDays - 1));
  // move start back to the previous Sunday to align columns
  const startDay = start.getDay();
  start.setDate(start.getDate() - startDay);

    for (let i = 0; i < totalDays; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0,10);
      days.push({ date: key, count: counts.get(key) || 0, color: colorForCount(counts.get(key) || 0, max) });
    }

    // chunk into weeks (each week is 7 days vertical)
    const weeksArr = [];
    for (let w = 0; w < weeks; w++) {
      const weekDays = days.slice(w * 7, w * 7 + 7);
      if (weekDays.length) weeksArr.push(weekDays);
    }
    return { weeksArr, max };
  };

  // legacy calculateStreak removed; use calculateStreaks() instead

  const streaks = calculateStreaks();

  // build heatmap weeks data
  const { weeksArr, max } = buildHeatmapWeeks(53);

  // build month groups so we can render month labels centered across multiple weeks
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const monthGroups = (() => {
    const groups = [];
    let curMonth = null;
    let curSpan = 0;
    let curStart = 0;
    weeksArr.forEach((week, idx) => {
      if (!week || week.length === 0) return;
      const thisMonth = new Date(week[0].date).getMonth();
      if (curMonth === null) {
        curMonth = thisMonth;
        curSpan = 1;
        curStart = idx;
      } else if (thisMonth === curMonth) {
        curSpan += 1;
      } else {
        groups.push({ month: monthNames[curMonth], span: curSpan, start: curStart });
        curMonth = thisMonth;
        curSpan = 1;
        curStart = idx;
      }
    });
    if (curMonth !== null) groups.push({ month: monthNames[curMonth], span: curSpan, start: curStart });
    return groups;
  })();

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>Your Study Dashboard</h2>
        <div className="stats">
          <div className="streak">
            🔥 Current Streak: {streaks.current} day{streaks.current !== 1 ? 's' : ''} · Best: {streaks.best} day{streaks.best !== 1 ? 's' : ''}
          </div>
          <div className="badges">
            {assignments.some(a => calculateProgress(a) === 100) && 
              <span className="badge" title="Completed an assignment">🏆</span>}
            {streaks.current >= 3 && 
              <span className="badge" title="3-day streak">⭐</span>}
          </div>
        </div>
        <div className="heatmap-legend">
          <span>Less</span>
          <div className="legend-swatch" style={{ background: '#ebedf0' }} />
          <div className="legend-swatch" style={{ background: '#c6e48b' }} />
          <div className="legend-swatch" style={{ background: '#7bc96f' }} />
          <div className="legend-swatch" style={{ background: '#239a3b' }} />
          <div className="legend-swatch" style={{ background: '#196127' }} />
          <span>More</span>
        </div>
      </div>

      <div className="heatmap-months">
        {(() => {
          const dayW = 12; // matches .day width
          const gap = 6; // matches .heatmap gap
          return monthGroups.map((g, i) => {
            const width = g.span * dayW + Math.max(0, g.span - 1) * gap;
            return (
              <div
                key={i}
                className="month-label"
                style={{ width: `${width}px` }}
              >{g.month}</div>
            );
          });
        })()}
      </div>

      <div className="heatmap" aria-hidden={false}>
        {weeksArr.map((week, wi) => (
          <div key={wi} className="week">
            {week.map((day) => (
              <div
                key={day.date}
                className="day"
                title={`${day.date}: ${day.count} completion${day.count !== 1 ? 's' : ''}`}
                style={{ background: day.color }}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="assignments-grid">
        {assignments.map((assignment, index) => (
          <div key={index} className="assignment-card">
            <h3>{assignment.name}</h3>
            <div className="assignment-details">
              {editingId === assignment.id ? (
                <div className="edit-form">
                  <div style={{ marginBottom: 8 }}>
                    <label>Name: </label>
                    <input value={editValues.name || ''} onChange={(e) => setEditValues({ ...editValues, name: e.target.value })} />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label>Due: </label>
                    <input type="date" value={editValues.due || ''} onChange={(e) => setEditValues({ ...editValues, due: e.target.value })} />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label>Duration (hrs): </label>
                    <input type="number" step="0.5" value={editValues.duration || 0} onChange={(e) => setEditValues({ ...editValues, duration: e.target.value })} />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label>Chunks: </label>
                    <input type="number" value={editValues.totalChunks || 1} onChange={(e) => setEditValues({ ...editValues, totalChunks: e.target.value })} />
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label>Subjects (comma-separated): </label>
                    <input value={(editValues.subject && (Array.isArray(editValues.subject) ? editValues.subject.join(', ') : editValues.subject)) || ''} onChange={(e) => setEditValues({ ...editValues, subject: e.target.value })} />
                  </div>
                  <div>
                    <button onClick={() => {
                      // save
                      const updated = { ...assignment,
                        name: editValues.name || assignment.name,
                        due: editValues.due || assignment.due,
                        duration: parseFloat(editValues.duration) || assignment.duration,
                        totalChunks: parseInt(editValues.totalChunks, 10) || assignment.totalChunks,
                        subject: (typeof editValues.subject === 'string') ? editValues.subject.split(',').map(s=>s.trim()).filter(Boolean) : (Array.isArray(editValues.subject) ? editValues.subject : assignment.subject)
                      };
                      onUpdateAssignment(updated);
                      setEditingId(null);
                      setEditValues({});
                    }}>Save</button>
                    <button onClick={() => { setEditingId(null); setEditValues({}); }} style={{ marginLeft: 8 }}>Cancel</button>
                  </div>
                </div>
              ) : null}
              <p>Due: {assignment.due ? new Date(assignment.due).toLocaleDateString() : 'No due date'}</p>
              <p>Estimated time: {getEstimatedHours(assignment)} hrs (~{getEstimatedDays(assignment)} day{getEstimatedDays(assignment) > 1 ? 's' : ''} at {assignment.dailyHours || 2}h/day)</p>
              <p>Subject: {Array.isArray(assignment.subject) ? assignment.subject.join(', ') : (assignment.subject || 'General')}</p>
              {(() => {
                const dueDays = daysUntilDue(assignment);
                const estDays = getEstimatedDays(assignment);
                if (dueDays === Infinity) return null;
                if (dueDays <= 0) return <p className="urgent">Overdue by {-dueDays} day{dueDays < -1 ? 's' : ''}</p>;
                if (dueDays < estDays) return <p className="urgent">Due in {dueDays} day{dueDays>1?'s':''} — you need to increase daily time or chunk more</p>;
                return <p className="ok">Due in {dueDays} day{dueDays>1?'s':''}</p>;
              })()}
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${calculateProgress(assignment)}%` }}
              />
            </div>
            <div className="chunks">
              {Array.from({ length: assignment.totalChunks || 1 }).map((_, i) => (
                <button
                  key={i}
                  className={`chunk ${i < (assignment.completedChunks || 0) ? 'completed' : ''}`}
                  onClick={() => onToggleChunk(assignment.id, i)}
                />
              ))}
            </div>
            <div style={{ marginTop: 8 }}>
              {editingId === assignment.id ? null : (
                <>
                  <button onClick={() => { setEditingId(assignment.id); setEditValues(assignment); }}>Edit</button>
                  <button
                    className="btn-delete"
                    style={{ marginLeft: 8 }}
                    onClick={() => setDeleteConfirm({ id: assignment.id, name: assignment.name })}
                  >Delete</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Delete confirmation dialog */}
      {deleteConfirm && (
        <div className="modal-backdrop" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Delete Assignment</h3>
            <p className="modal-message">
              Are you sure you want to delete "{deleteConfirm.name}"? This cannot be undone.
            </p>
            <div className="modal-buttons">
              <button
                className="modal-button secondary"
                onClick={() => setDeleteConfirm(null)}
              >
                No
              </button>
              <button
                className="modal-button primary"
                onClick={() => {
                  if (typeof onDeleteAssignment === 'function') {
                    onDeleteAssignment(deleteConfirm.id);
                  }
                  setDeleteConfirm(null);
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;