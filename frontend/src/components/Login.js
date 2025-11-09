import React, { useState } from 'react';
import './Login.css';
import { authAPI, setAuthToken } from '../utils/apiClient';

const Login = ({ onLogin, onRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        // Register new user
        const response = await authAPI.register(email, password, name);
        setAuthToken(response.token || null);
        // After registration, automatically log them in
        if (onRegister) {
          await onRegister(response.user);
        } else {
          // Fallback: try to login after registration
          await onLogin(email, password);
        }
      } else {
        await onLogin(email, password);
      }
    } catch (err) {
      console.error('Auth error:', err);
      let errorMessage = err.message || (isRegister ? 'Registration failed. Please try again.' : 'Login failed. Please check your credentials.');
      
      // Provide more specific error messages
      if (err.message.includes('Cannot connect') || err.message.includes('fetch')) {
        errorMessage = 'Cannot connect to server. Please make sure the backend is running on http://localhost:3000';
      } else if (err.message.includes('Invalid credentials') || err.message.includes('401')) {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (err.message.includes('already exists') || err.message.includes('400')) {
        errorMessage = 'An account with this email already exists. Please login instead.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-logo">Let's lock-in!</h1>
          <p className="login-subtitle">Your ADHD Study Companion</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          {isRegister && (
            <div className="form-group">
              <label className="label">Name</label>
              <input
                type="text"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required={isRegister}
              />
            </div>
          )}
          
          <div className="form-group">
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              required
            />
          </div>
          
          <div className="form-group">
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary login-submit"
            disabled={loading}
          >
            {loading ? 'Loading...' : (isRegister ? 'Register' : 'Login')}
          </button>
        </form>

        <div className="login-footer">
          <button
            type="button"
            className="toggle-mode-btn"
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
          >
            {isRegister
              ? 'Already have an account? Login'
              : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;

