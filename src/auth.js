// JWT storage for the signed-in user. The API issues short-lived tokens, so we
// keep the expiry alongside and treat an expired token as signed out.
const STORAGE_KEY = 'calendar_auth';
export const AUTH_EXPIRED_EVENT = 'calendar:auth-expired';

export function getToken() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && saved.token && saved.expiresAt > Date.now()) return saved.token;
  } catch {
    // Corrupt entry: fall through and treat as signed out.
  }
  return null;
}

export function setToken(token, expiresInSeconds) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ token, expiresAt: Date.now() + expiresInSeconds * 1000 })
  );
}

export function clearToken() {
  localStorage.removeItem(STORAGE_KEY);
}
