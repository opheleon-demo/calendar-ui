import { LOCAL_TZ } from './utils/dates';
import { getToken, clearToken } from './auth';

const BASE = 'http://localhost:8000';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function errorMessage(res, fallback) {
  try {
    const body = await res.json();
    if (typeof body.detail === 'string') return body.detail;
    if (Array.isArray(body.detail) && body.detail[0]?.msg) return body.detail[0].msg;
  } catch {
    // Non-JSON error body; use the fallback.
  }
  return fallback;
}

// Calendar requests always carry the signed-in person's token. A 401 means
// the token is missing, expired or invalid: drop it so the app returns to
// sign-in rather than showing stale data.
async function calendarRequest(path, { method = 'GET', body } = {}, fallback) {
  const token = getToken();
  if (!token) {
    clearToken();
    throw new ApiError('Your session has expired. Please sign in again.', 401);
  }

  const headers = { Authorization: `Bearer ${token}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    throw new ApiError('Could not reach the calendar server.', 0);
  }

  if (res.status === 401) {
    clearToken();
    throw new ApiError('Your session has expired. Please sign in again.', 401);
  }
  if (!res.ok) throw new ApiError(await errorMessage(res, fallback), res.status);
  return res.json();
}

async function authRequest(path, data, fallback) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch {
    throw new ApiError('Could not reach the calendar server.', 0);
  }
  if (!res.ok) throw new ApiError(await errorMessage(res, fallback), res.status);
  return res.json();
}

export function login(username, password) {
  return authRequest('/auth/login', { username, password }, 'Sign-in failed.');
}

export function register(username, password) {
  return authRequest('/auth/register', { username, password }, 'Registration failed.');
}

export function fetchEvents(start, end, tz = LOCAL_TZ) {
  return calendarRequest(
    `/events?start=${start}&end=${end}&tz=${encodeURIComponent(tz)}`,
    {},
    'Failed to load events.'
  );
}

export function createEvent(data) {
  return calendarRequest('/events', { method: 'POST', body: data }, 'Failed to create event.');
}

export function updateEvent(id, data) {
  return calendarRequest(`/events/${id}`, { method: 'PUT', body: data }, 'Failed to update event.');
}

export function updateOccurrence(id, date, data) {
  return calendarRequest(
    `/events/${id}/occurrence/${date}`,
    { method: 'PUT', body: data },
    'Failed to update occurrence.'
  );
}

export function updateSeries(id, data) {
  return calendarRequest(`/events/${id}/series`, { method: 'PUT', body: data }, 'Failed to update series.');
}

export function deleteEvent(id) {
  return calendarRequest(`/events/${id}`, { method: 'DELETE' }, 'Failed to delete event.');
}

export function deleteOccurrence(id, date) {
  return calendarRequest(
    `/events/${id}/occurrence/${date}`,
    { method: 'DELETE' },
    'Failed to delete occurrence.'
  );
}
