import { LOCAL_TZ } from './utils/dates';
import { getToken, setToken, clearToken, AUTH_EXPIRED_EVENT } from './auth';

const BASE = 'http://localhost:8000';

// Every call sends the stored JWT. A 401 on an authenticated call means the
// session ended, so we clear it and let the app return to the login screen.
async function request(path, { headers, ...options } = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (res.status === 401 && token) {
    clearToken();
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
  }
  return res;
}

function jsonBody(method, data) {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
}

async function errorMessage(res, fallback) {
  try {
    const body = await res.json();
    if (typeof body.detail === 'string') return body.detail;
  } catch {
    // Not JSON; use the fallback.
  }
  return fallback;
}

// ── Auth ────────────────────────────────────────────────────

async function authenticate(path, username, password) {
  const res = await request(path, jsonBody('POST', { username, password }));
  if (!res.ok) {
    const fallback = res.status === 401 ? 'Incorrect username or password' : 'Request failed';
    throw new Error(res.status === 422 ? 'Password must be at least 8 characters' : await errorMessage(res, fallback));
  }
  const { access_token, expires_in } = await res.json();
  setToken(access_token, expires_in);
}

export function login(username, password) {
  return authenticate('/auth/login', username, password);
}

export function register(username, password) {
  return authenticate('/auth/register', username, password);
}

// ── Events ──────────────────────────────────────────────────

export async function fetchEvents(start, end, tz = LOCAL_TZ) {
  const res = await request(
    `/events?start=${start}&end=${end}&tz=${encodeURIComponent(tz)}`
  );
  if (!res.ok) throw new Error('Failed to fetch events');
  return res.json();
}

export async function createEvent(data) {
  const res = await request('/events', jsonBody('POST', data));
  return res.json();
}

export async function updateEvent(id, data) {
  const res = await request(`/events/${id}`, jsonBody('PUT', data));
  return res.json();
}

export async function updateOccurrence(id, date, data) {
  const res = await request(`/events/${id}/occurrence/${date}`, jsonBody('PUT', data));
  return res.json();
}

export async function updateSeries(id, data) {
  const res = await request(`/events/${id}/series`, jsonBody('PUT', data));
  return res.json();
}

export async function deleteEvent(id) {
  await request(`/events/${id}`, { method: 'DELETE' });
}

export async function deleteOccurrence(id, date) {
  await request(`/events/${id}/occurrence/${date}`, { method: 'DELETE' });
}

// ── Zoom ────────────────────────────────────────────────────

export async function fetchZoomStatus() {
  const res = await request('/zoom/status');
  if (!res.ok) throw new Error(await errorMessage(res, 'Could not load Zoom status'));
  return res.json();
}

export async function startZoomAuthorization() {
  const res = await request('/zoom/authorize');
  if (!res.ok) throw new Error(await errorMessage(res, 'Could not start Zoom authorization'));
  const { authorization_url } = await res.json();
  return authorization_url;
}

export async function disconnectZoom() {
  const res = await request('/zoom/connection', { method: 'DELETE' });
  if (!res.ok) throw new Error(await errorMessage(res, 'Could not disconnect Zoom'));
  return res.json();
}
