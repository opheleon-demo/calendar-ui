import { useState } from 'react';
import * as api from '../api';
import { setSession } from '../session';

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
    if (!username.trim()) errors.username = 'Username is required.';
    if (!password) errors.password = 'Password is required.';
    else if (isRegister && password.length < 8) errors.password = 'Password must be at least 8 characters.';
    return errors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = validate();
    setFieldErrors(errors);
    setError(null);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const name = username.trim();
      const result = isRegister
        ? await api.register(name, password)
        : await api.login(name, password);
      setSession(result.access_token, name);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
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
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <h2>{isRegister ? 'Create an account' : 'Sign in'}</h2>
        {error && <div className="auth-error" role="alert">{error}</div>}
        <label>
          Username
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
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
          />
          {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
        </label>
        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Please wait…' : isRegister ? 'Register' : 'Sign in'}
        </button>
        <button type="button" className="btn-link" onClick={switchMode} disabled={submitting}>
          {isRegister ? 'Already have an account? Sign in' : 'New here? Create an account'}
        </button>
      </form>
    </div>
  );
}
