import { useState } from 'react';
import * as api from '../api';
import { saveSession } from '../session';

function errorMessage(err, mode) {
  if (err.status === undefined) return 'Could not reach the server. Check your connection and try again.';
  if (mode === 'login' && err.status === 401) return 'Incorrect username or password.';
  if (err.status === 409) return 'That username is already taken.';
  if (err.status === 400 || err.status === 422) return 'Check the highlighted fields and try again.';
  return 'Something went wrong. Please try again.';
}

export default function SignIn() {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const isRegister = mode === 'register';

  function validate() {
    const errors = {};
    if (!username.trim()) errors.username = 'Enter a username.';
    else if (username.trim().length > 150) errors.username = 'Use 150 characters or fewer.';
    if (!password) errors.password = 'Enter a password.';
    else if (isRegister && password.length < 8) errors.password = 'Use at least 8 characters.';
    return errors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = validate();
    setFieldErrors(errors);
    setError(null);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    const name = username.trim();
    try {
      const token = isRegister
        ? await api.register(name, password)
        : await api.login(name, password);
      saveSession(token, name);
    } catch (err) {
      setError(errorMessage(err, mode));
      setSubmitting(false);
    }
  }

  function switchMode() {
    setMode(isRegister ? 'login' : 'register');
    setFieldErrors({});
    setError(null);
  }

  return (
    <div className="auth-page">
      <form className="modal auth-card" onSubmit={handleSubmit} noValidate>
        <h3>{isRegister ? 'Create an account' : 'Sign in'}</h3>
        <label>
          Username
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
            aria-invalid={!!fieldErrors.username}
            autoFocus
          />
          {fieldErrors.username && <span className="field-error">{fieldErrors.username}</span>}
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            aria-invalid={!!fieldErrors.password}
          />
          {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
        </label>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={switchMode} disabled={submitting}>
            {isRegister ? 'I have an account' : 'Create account'}
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Please wait…' : isRegister ? 'Register' : 'Sign in'}
          </button>
        </div>
      </form>
    </div>
  );
}
