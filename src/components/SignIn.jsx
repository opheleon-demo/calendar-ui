import { useState } from 'react';
import * as api from '../api';
import { setToken } from '../auth';

export default function SignIn({ notice }) {
  const [mode, setMode] = useState('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isRegister = mode === 'register';

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Enter a username and password.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { access_token } = isRegister
        ? await api.register(username.trim(), password)
        : await api.login(username.trim(), password);
      setToken(access_token);
    } catch (err) {
      if (!isRegister && err.status === 401) {
        setError('Incorrect username or password.');
      } else {
        setError(err.message);
      }
      setSubmitting(false);
    }
  }

  function toggleMode() {
    setMode(isRegister ? 'signin' : 'register');
    setError(null);
  }

  return (
    <div className="signin-page">
      <form className="modal modal-sm signin-card" onSubmit={handleSubmit}>
        <h3>{isRegister ? 'Create an account' : 'Sign in'}</h3>
        {notice && !error && <div className="notice">{notice}</div>}
        {error && <div className="error-banner" role="alert">{error}</div>}
        <label>
          Username
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
            disabled={submitting}
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            disabled={submitting}
          />
        </label>
        <div className="modal-actions">
          <button type="button" className="btn" onClick={toggleMode} disabled={submitting}>
            {isRegister ? 'Have an account? Sign in' : 'Create an account'}
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Please wait…' : isRegister ? 'Register' : 'Sign in'}
          </button>
        </div>
      </form>
    </div>
  );
}
