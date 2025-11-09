import React, { useState } from 'react';
import './CanvasTokenModal.css';
import { authAPI } from '../utils/apiClient';

const CanvasTokenModal = ({ isOpen, onClose, onSuccess }) => {
  const [token, setToken] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://canvas.instructure.com');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authAPI.connectCanvasWithToken(token.trim(), baseUrl.trim());
      onSuccess();
      onClose();
      setToken('');
      setBaseUrl('https://canvas.instructure.com');
    } catch (err) {
      setError(err.message || 'Failed to connect Canvas. Please check your token.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Connect Canvas with Access Token</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <p className="modal-instructions">
            Don't have admin access? Use a Personal Access Token instead!
          </p>

          <ol className="token-instructions">
            <li>Login to Canvas</li>
            <li>Go to <strong>Account → Settings → New Access Token</strong></li>
            <li>Enter a purpose (e.g., "ADHD Study App")</li>
            <li>Click <strong>"Generate Token"</strong></li>
            <li>Copy the token (you'll only see it once!)</li>
            <li>Paste it below</li>
          </ol>

          <form onSubmit={handleSubmit} className="token-form">
            <div className="form-group">
              <label htmlFor="canvas-url">Canvas Base URL:</label>
              <input
                id="canvas-url"
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://canvas.instructure.com"
                required
                disabled={loading}
              />
              <small>Your Canvas instance URL (usually https://your-school.instructure.com)</small>
            </div>

            <div className="form-group">
              <label htmlFor="canvas-token">Canvas Access Token:</label>
              <input
                id="canvas-token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste your Canvas access token here"
                required
                disabled={loading}
              />
              <small>Your personal access token from Canvas</small>
            </div>

            {error && (
              <div className="error-message">
                ⚠️ {error}
              </div>
            )}

            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn-submit" disabled={loading || !token.trim()}>
                {loading ? 'Connecting...' : 'Connect Canvas'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CanvasTokenModal;

