import { useState } from 'react';
import * as api from '../api';

function validate({ username, password }) {
  const errors = {};
  const name = username.trim();
  if (!name) errors.username = 'Enter a username.';
  else if (name.length > 150) errors.username = 'Username must be 150 characters or fewer.';
  if (!password) errors.password = 'Enter a password.';
  return errors;
}

export default function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('signin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isRegister = mode === 'register';

  function switchMode() {
    setMode(isRegister ? 'signin' : 'register');
    setFieldErrors({});
    setFormError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;

    const errors = validate({ username, password });
    if (isRegister && password && password.length < 8) {
      errors.password = 'Password must be at least 8 characters.';
    }
    setFieldErrors(errors);
    setFormError('');
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const call = isRegister ? api.register : api.login;
      const tokenResponse = await call(username.trim(), password);
      onAuthenticated(tokenResponse);
    } catch (err) {
      // Typed values stay in place so the person can retry.
      if (err.status === 409) setFieldErrors({ username: err.message });
      else setFieldErrors(err.fieldErrors || {});
      setFormError(err.status === 409 ? '' : err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={handleSubmit} noValidate aria-busy={submitting}>
        <h1 className="auth-title">{isRegister ? 'Create an account' : 'Sign in'}</h1>

        {formError && <div className="auth-error" role="alert">{formError}</div>}

        <label className="auth-field">
          <span>Username</span>
          <input
            type="text"
            autoComplete="username"
            value={username}
            maxLength={200}
            onChange={e => setUsername(e.target.value)}
            disabled={submitting}
            aria-invalid={!!fieldErrors.username}
            autoFocus
          />
          {fieldErrors.username && <span className="field-error">{fieldErrors.username}</span>}
        </label>

        <label className="auth-field">
          <span>Password</span>
          <input
            type="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={submitting}
            aria-invalid={!!fieldErrors.password}
          />
          {isRegister && !fieldErrors.password && (
            <span className="field-hint">At least 8 characters.</span>
          )}
          {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
        </label>

        <button type="submit" className="btn btn-primary auth-submit" disabled={submitting}>
          {submitting
            ? (isRegister ? 'Creating account…' : 'Signing in…')
            : (isRegister ? 'Create account' : 'Sign in')}
        </button>

        <p className="auth-switch">
          {isRegister ? 'Already have an account?' : 'New here?'}{' '}
          <button type="button" className="link-button" onClick={switchMode} disabled={submitting}>
            {isRegister ? 'Sign in' : 'Create an account'}
          </button>
        </p>
      </form>
    </div>
  );
}
