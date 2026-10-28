import { useState, useEffect } from 'react';
import LoginForm from './LoginForm';
import App from '../App';
import { getToken, clearToken, AUTH_EXPIRED_EVENT } from '../auth';

export default function AuthGate() {
  const [signedIn, setSignedIn] = useState(() => !!getToken());
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    function handleExpired() {
      setSignedIn(false);
      setNotice('Your session expired. Please sign in again.');
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleExpired);
  }, []);

  function handleSignOut() {
    clearToken();
    setNotice(null);
    setSignedIn(false);
  }

  if (!signedIn) {
    return (
      <LoginForm
        notice={notice}
        onAuthenticated={() => { setNotice(null); setSignedIn(true); }}
      />
    );
  }
  return <App onSignOut={handleSignOut} />;
}
