import { LOCAL_TZ } from './utils/dates';
import { getToken, clearSession } from './session';

const BASE = 'http://localhost:8000';

export class ApiError extends Error {
  constructor(message, status, detail) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

async function readError(res, fallback) {
  let detail = null;
  try {
    detail = (await res.json()).detail ?? null;
  } catch {
    // Non-JSON error body.
  }
  return new ApiError(typeof detail === 'string' ? detail : fallback, res.status, detail);
}

// Calendar requests always carry the current token. A 401 means the token is
// missing, expired, or revoked, so the session is cleared and the app returns
// to sign-in. Only clear if the session hasn't already changed meanwhile, so a
// late 401 from a previous person's request can't sign out the next person.
async function calendarRequest(path, { method = 'GET', body } = {}) {
  const token = getToken();
  if (!token) {
    clearSession();
    throw new ApiError('Not signed in', 401);
  }
  const headers = { Authorization: `Bearer ${token}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  if (res.status === 401) {
    if (getToken() === token) clearSession();
    throw new ApiError('Your session has ended. Please sign in again.', 401);
  }
  if (!res.ok) throw await readError(res, 'Request failed');
  return res.status === 204 ? null : res.json();
}

async function authRequest(path, username, password, fallback) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw await readError(res, fallback);
  return res.json();
}

export function login(username, password) {
  return authRequest('/auth/login', username, password, 'Sign-in failed');
}

export function register(username, password) {
  return authRequest('/auth/register', username, password, 'Registration failed');
}

export function fetchEvents(start, end, tz = LOCAL_TZ) {
  return calendarRequest(`/events?start=${start}&end=${end}&tz=${encodeURIComponent(tz)}`);
}

export function createEvent(data) {
  return calendarRequest('/events', { method: 'POST', body: data });
}

export function updateEvent(id, data) {
  return calendarRequest(`/events/${id}`, { method: 'PUT', body: data });
}

export function updateOccurrence(id, date, data) {
  return calendarRequest(`/events/${id}/occurrence/${date}`, { method: 'PUT', body: data });
}

export function updateSeries(id, data) {
  return calendarRequest(`/events/${id}/series`, { method: 'PUT', body: data });
}

export async function deleteEvent(id) {
  await calendarRequest(`/events/${id}`, { method: 'DELETE' });
}

export async function deleteOccurrence(id, date) {
  await calendarRequest(`/events/${id}/occurrence/${date}`, { method: 'DELETE' });
}
