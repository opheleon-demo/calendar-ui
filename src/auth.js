// Session token storage shared by api.js and the UI.
//
// The token lives in localStorage so a reload keeps the person signed in, and
// listeners are notified on changes in this tab and (via the `storage` event)
// in other tabs, so signing out anywhere hides calendar data everywhere.

const TOKEN_KEY = 'calendar.token';
const listeners = new Set();

function decodeExp(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(payload));
    return typeof exp === 'number' ? exp * 1000 : null;
  } catch {
    return null;
  }
}

function isExpired(token) {
  const exp = decodeExp(token);
  return exp === null || exp <= Date.now();
}

function notify() {
  listeners.forEach(fn => fn());
}

// Returns the stored token, or null if there is none or it has expired.
// Pure read: callers that find no usable token call clearToken().
export function getToken() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token || isExpired(token)) return null;
  return token;
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
  notify();
}

export function clearToken() {
  if (localStorage.getItem(TOKEN_KEY) === null) return;
  localStorage.removeItem(TOKEN_KEY);
  notify();
}

export function subscribe(fn) {
  listeners.add(fn);
  const onStorage = e => {
    if (e.key === TOKEN_KEY || e.key === null) fn();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener('storage', onStorage);
  };
}
