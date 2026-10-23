import { useState, useEffect } from 'react';
import Calendar from './components/Calendar';
import AuthScreen from './components/AuthScreen';
import { loadSession, saveSession, clearSession } from './session';
import './App.css';

export default function App() {
  const [session, setSession] = useState(loadSession);

  // Return to sign-in once the token expires.
  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(() => {
      clearSession();
      setSession(null);
    }, session.expiresAt - Date.now());
    return () => clearTimeout(timer);
  }, [session]);

  function handleAuthenticated(tokenResponse) {
    setSession(saveSession(tokenResponse));
  }

  function handleSignOut() {
    clearSession();
    setSession(null);
  }

  if (!session) return <AuthScreen onAuthenticated={handleAuthenticated} />;
  // Keyed by token so a new sign-in never reuses the previous person's state.
  return <Calendar key={session.token} onSignOut={handleSignOut} />;
}
