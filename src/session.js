// Signed-in session, persisted in localStorage so it survives reloads and is
// shared between tabs. Every change (sign-in, sign-out, expiry, a 401, or
// another tab writing the key) notifies subscribers so the UI re-renders.

const SESSION_KEY = 'calendar.session';

const listeners = new Set();
let cachedRaw = null;
let cachedSession = null;
let expiryTimer = null;

function decodeTokenSubject(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload)).sub ?? null;
  } catch {
    return null;
  }
}

function parse(raw) {
  if (!raw) return null;
  try {
    const session = JSON.parse(raw);
    if (!session.token || !session.expiresAt || session.expiresAt <= Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

function scheduleExpiry(session) {
  clearTimeout(expiryTimer);
  expiryTimer = null;
  if (session) {
    expiryTimer = setTimeout(clearSession, Math.max(0, session.expiresAt - Date.now()));
  }
}

function notify() {
  listeners.forEach(listener => listener());
}

function readStorage() {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function getSession() {
  const raw = readStorage();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSession = parse(raw);
    scheduleExpiry(cachedSession);
  }
  return cachedSession;
}

export function getToken() {
  return getSession()?.token ?? null;
}

export function saveSession({ access_token, expires_in }, username) {
  const session = {
    token: access_token,
    username,
    userId: decodeTokenSubject(access_token) ?? username,
    expiresAt: Date.now() + expires_in * 1000,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  notify();
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // Storage unavailable; the in-memory snapshot below still signs out.
  }
  cachedRaw = null;
  cachedSession = null;
  scheduleExpiry(null);
  notify();
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

if (typeof window !== 'undefined') {
  // Another tab signed in, signed out, or switched user.
  window.addEventListener('storage', e => {
    if (e.key === SESSION_KEY || e.key === null) notify();
  });
  // Back/forward can restore this page from the bfcache with the previous
  // person's events still rendered; re-check storage when that happens.
  window.addEventListener('pageshow', e => {
    if (e.persisted) notify();
  });
  // Drop an expired session left over from a previous visit.
  if (readStorage() && !getSession()) clearSession();
}
