/**
 * Signed-in session storage.
 *
 * The bearer token lives in localStorage so it survives reloads and is shared
 * across tabs. Every change (sign-in, sign-out, a rejected token) is broadcast
 * to listeners in this tab, and other tabs pick it up via the `storage` event.
 */

const STORAGE_KEY = 'calendar.session';

const listeners = new Set();

function decodeTokenPayload(token) {
  try {
    const part = token.split('.')[1];
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function readStored() {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.token !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

function isExpired(session) {
  const payload = decodeTokenPayload(session.token);
  if (!payload || typeof payload.exp !== 'number') return false;
  return payload.exp * 1000 <= Date.now();
}

/** Current valid session ({ token, userId, username }) or null. */
export function getSession() {
  const session = readStored();
  if (!session) return null;
  if (isExpired(session)) {
    clearSession();
    return null;
  }
  return session;
}

export function getToken() {
  return getSession()?.token ?? null;
}

export function setSession(token, username) {
  const payload = decodeTokenPayload(token);
  const session = { token, username, userId: payload?.sub ?? null };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  notify();
  return session;
}

export function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable; nothing persisted to remove.
  }
  notify();
}

/** Subscribe to session changes in this tab and in other tabs. */
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  const session = readStored();
  listeners.forEach(listener => listener(session));
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', e => {
    if (e.key === STORAGE_KEY || e.key === null) notify();
  });
}
