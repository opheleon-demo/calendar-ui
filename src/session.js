const STORAGE_KEY = 'calendar.session';

// Returns the stored session, or null if there is none or it has expired.
export function loadSession() {
  try {
    const session = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (session?.token && session.expiresAt > Date.now()) return session;
  } catch {
    // Unreadable storage is treated as signed out.
  }
  localStorage.removeItem(STORAGE_KEY);
  return null;
}

export function saveSession({ access_token, expires_in }) {
  const session = { token: access_token, expiresAt: Date.now() + expires_in * 1000 };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return session;
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}
