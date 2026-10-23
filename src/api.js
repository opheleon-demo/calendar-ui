import { LOCAL_TZ } from './utils/dates';
import { getToken, clearSession } from './session';

const BASE = 'http://localhost:8000';

export class AuthError extends Error {}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function errorMessage(res, fallback) {
  try {
    const body = await res.json();
    if (typeof body.detail === 'string') return body.detail;
  } catch {
    // Non-JSON error body.
  }
  return fallback;
}

async function postAuth(path, username, password) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
  } catch {
    throw new ApiError('Could not reach the server. Please try again.', 0);
  }
  if (!res.ok) {
    throw new ApiError(await errorMessage(res, 'Request failed'), res.status);
  }
  return res.json();
}

export async function login(username, password) {
  try {
    return await postAuth('/auth/login', username, password);
  } catch (e) {
    if (e.status === 401) throw new ApiError('Incorrect username or password.', 401);
    throw e;
  }
}

export function register(username, password) {
  return postAuth('/auth/register', username, password);
}

/**
 * Authenticated calendar request. Sends the signed-in person's token and, if
 * the API rejects it (expired, tampered, or signed out elsewhere), clears the
 * session so the app returns to sign-in instead of showing stale data.
 */
async function request(path, options = {}) {
  const token = getToken();
  if (!token) {
    clearSession();
    throw new AuthError('Not signed in');
  }
  const headers = { ...options.headers, Authorization: `Bearer ${token}` };
  if (options.body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}${path}`, { ...options, headers, cache: 'no-store' });
  if (res.status === 401) {
    clearSession();
    throw new AuthError('Session expired');
  }
  if (!res.ok) {
    throw new ApiError(await errorMessage(res, 'Request failed'), res.status);
  }
  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export function fetchEvents(start, end, tz = LOCAL_TZ) {
  return request(`/events?start=${start}&end=${end}&tz=${encodeURIComponent(tz)}`);
}

export function createEvent(data) {
  return request('/events', { method: 'POST', body: JSON.stringify(data) });
}

export function updateEvent(id, data) {
  return request(`/events/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function updateOccurrence(id, date, data) {
  return request(`/events/${id}/occurrence/${date}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function updateSeries(id, data) {
  return request(`/events/${id}/series`, { method: 'PUT', body: JSON.stringify(data) });
}

export function deleteEvent(id) {
  return request(`/events/${id}`, { method: 'DELETE' });
}

export function deleteOccurrence(id, date) {
  return request(`/events/${id}/occurrence/${date}`, { method: 'DELETE' });
}
