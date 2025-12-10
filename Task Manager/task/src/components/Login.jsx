import React, { useState } from 'react';
import { login, register } from '../utils/api';
import './Login.css';

export default function Login({ onAuth }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [role, setRole] = useState('employee');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRoleChange = (r) => {
    setRole(r);
    setError('');
  };

  const handleToggleMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const { ok, data } = await login(email, password);
      if (ok) {
        onAuth && onAuth({ role: data.user.role, email: data.user.email, userId: data.user._id });
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('Failed to connect to server. Make sure backend is running on http://localhost:5000');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !password) {
      setError('All fields are required');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const { ok, data } = await register(name, email, password, role);
      if (ok) {
        onAuth && onAuth({ role: data.user.role, email: data.user.email, userId: data.user._id });
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (err) {
      setError('Failed to connect to server. Make sure backend is running on http://localhost:5000');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <div className={`login-card ${role === 'admin' ? 'admin' : 'employee'}`}>
        <div className="login-header">
          <h2>{isRegistering ? 'Create Account' : 'Sign in'}</h2>
          <p className="muted">
            {isRegistering 
              ? `Register as ${role === 'admin' ? 'Admin' : 'Employee'}` 
              : `Access your ${role === 'admin' ? 'Admin' : 'Employee'} dashboard`}
          </p>
        </div>

        <div className="role-toggle">
          <button
            className={role === 'employee' ? 'active' : ''}
            onClick={() => handleRoleChange('employee')}
            aria-pressed={role === 'employee'}
            disabled={isRegistering}
          >
            Employee
          </button>
          <button
            className={role === 'admin' ? 'active' : ''}
            onClick={() => handleRoleChange('admin')}
            aria-pressed={role === 'admin'}
          >
            Admin
          </button>
        </div>

        <form className="login-form" onSubmit={isRegistering ? handleRegisterSubmit : handleLoginSubmit} noValidate>
          {isRegistering && (
            <label className="field">
              <span className="label">Full Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                autoComplete="name"
              />
            </label>
          )}

          <label className="field">
            <span className="label">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              autoComplete="username"
            />
          </label>

          <label className="field">
            <span className="label">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </label>

          {isRegistering && (
            <label className="field">
              <span className="label">Confirm Password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                autoComplete="current-password"
              />
            </label>
          )}

          <div className="actions">
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? 'Processing…' : (isRegistering ? 'Create Account' : `Sign in as ${role === 'admin' ? 'Admin' : 'Employee'}`)}
            </button>
            <button type="button" className="btn ghost" onClick={() => { setEmail(''); setPassword(''); setConfirmPassword(''); setError(''); }}>
              Clear
            </button>
          </div>

          {error && <div className="error">{error}</div>}

          {!isRegistering && (
            <div className="info-message">
              <p><i className="fas fa-lightbulb"></i> Admin? You can create an account by toggling to Admin and clicking Register below.</p>
            </div>
          )}

          <div className="toggle-mode">
            {isRegistering ? (
              <p>Already have an account? <button type="button" onClick={handleToggleMode} className="link-btn">Sign In</button></p>
            ) : (
              <p>Admin? <button type="button" onClick={handleToggleMode} className="link-btn">Register as Admin</button></p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

