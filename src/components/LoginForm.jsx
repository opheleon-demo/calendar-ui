import { useState } from 'react';
import * as api from '../api';

export default function LoginForm({ onAuthenticated, notice }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const isLogin = mode === 'login';

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await (isLogin ? api.login : api.register)(username.trim(), password);
      onAuthenticated();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  function toggleMode() {
    setMode(isLogin ? 'register' : 'login');
    setError(null);
  }

  return (
    <div className="auth-page">
      <form className="modal auth-card" onSubmit={handleSubmit}>
        <h3>{isLogin ? 'Sign in' : 'Create an account'}</h3>
        {notice && <p className="notice notice-info">{notice}</p>}
        {error && <p className="notice notice-error">{error}</p>}
        <label>
          Username
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
            required
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            minLength={isLogin ? undefined : 8}
            required
          />
        </label>
        <div className="modal-actions">
          <button type="button" className="btn btn-link" onClick={toggleMode}>
            {isLogin ? 'Create an account' : 'I already have an account'}
          </button>
          <div className="modal-actions-right">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {isLogin ? 'Sign in' : 'Register'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
