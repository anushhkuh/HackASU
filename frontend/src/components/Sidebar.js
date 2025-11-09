import React from 'react';
import './Sidebar.css';

const Sidebar = ({ currentPage, onPageChange }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'attention', label: 'Attention Check', icon: '📷' },
    { id: 'notes', label: 'Notes', icon: '📝' },
    { id: 'cheatsheets', label: 'Cheatsheets', icon: '📚' },
    { id: 'chunking', label: 'Assignment Chunks', icon: '✂️' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2 className="sidebar-logo">Focus Pocus</h2>
        <p className="sidebar-tagline">Your ADHD Study Companion</p>
      </div>
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => onPageChange(item.id)}
            aria-label={item.label}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <div className="motivational-quote">
          <p>"Progress, not perfection"</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

