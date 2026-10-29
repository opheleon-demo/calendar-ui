import { useState } from 'react';
import { authenticate } from '../api';

export default function Login() {
  const [register, setRegister] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try { await authenticate(form.get('username'), form.get('password'), register); }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }
  return <div className="login-panel modal">
    <h1>Calendar</h1>
    <p>Sign in to manage your calendar and connect your Zoom account. If your session expired, sign in again to restore your draft.</p>
    <form onSubmit={submit}>
      <label>Username<input name="username" autoComplete="username" required /></label>
      <label>Password<input name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 8 : 1} required /></label>
      {error && <p role="alert">{error}</p>}
      <button className="btn btn-primary" disabled={busy}>{register ? 'Register' : 'Sign in'}</button>
      <button className="btn" type="button" onClick={() => setRegister(!register)}>{register ? 'Use existing account' : 'Create account'}</button>
    </form>
  </div>;
}
