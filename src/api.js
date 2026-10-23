import { LOCAL_TZ } from './utils/dates';
import { loadSession } from './session';

const BASE = 'http://localhost:8000';

export class ApiError extends Error {
  constructor(message, { status = 0, fieldErrors = {} } = {}) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

async function postAuth(path, username, password, messages) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: authHeaders(JSON_HEADERS),
      body: JSON.stringify({ username, password }),
    });
  } catch {
    throw new ApiError('Could not reach the server. Check your connection and try again.');
  }

  const body = await res.json().catch(() => null);
  if (res.ok && body?.access_token) return body;

  const message = messages[res.status];
  if (message) throw new ApiError(message, { status: res.status });
  if (res.status === 409) {
    throw new ApiError(body?.detail || 'Username already exists', { status: 409 });
  }
  if (res.status === 422 && Array.isArray(body?.detail)) {
    const fieldErrors = {};
    for (const err of body.detail) {
      const field = err.loc?.[err.loc.length - 1];
      if (field === 'username' || field === 'password') fieldErrors[field] ??= err.msg;
    }
    throw new ApiError('Please fix the highlighted fields.', { status: 422, fieldErrors });
  }
  throw new ApiError('Something went wrong on our side. Please try again.', { status: res.status });
}

export function register(username, password) {
  return postAuth('/auth/register', username, password, {});
}

export function login(username, password) {
  // Same message for unknown users and wrong passwords.
  return postAuth('/auth/login', username, password, {
    401: 'Incorrect username or password.',
    422: 'Incorrect username or password.',
  });
}

function authHeaders(extra = {}) {
  const session = loadSession();
  return session ? { ...extra, Authorization: `Bearer ${session.token}` } : extra;
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export async function fetchEvents(start, end, tz = LOCAL_TZ) {
  const res = await fetch(
    `${BASE}/events?start=${start}&end=${end}&tz=${encodeURIComponent(tz)}`,
    { headers: authHeaders() }
  );
  if (!res.ok) throw new Error('Failed to fetch events');
  return res.json();
}

export async function createEvent(data) {
  const res = await fetch(`${BASE}/events`, {
    method: 'POST',
    headers: authHeaders(JSON_HEADERS),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateEvent(id, data) {
  const res = await fetch(`${BASE}/events/${id}`, {
    method: 'PUT',
    headers: authHeaders(JSON_HEADERS),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateOccurrence(id, date, data) {
  const res = await fetch(`${BASE}/events/${id}/occurrence/${date}`, {
    method: 'PUT',
    headers: authHeaders(JSON_HEADERS),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateSeries(id, data) {
  const res = await fetch(`${BASE}/events/${id}/series`, {
    method: 'PUT',
    headers: authHeaders(JSON_HEADERS),
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteEvent(id) {
  await fetch(`${BASE}/events/${id}`, { method: 'DELETE', headers: authHeaders() });
}

export async function deleteOccurrence(id, date) {
  await fetch(`${BASE}/events/${id}/occurrence/${date}`, { method: 'DELETE', headers: authHeaders() });
}
