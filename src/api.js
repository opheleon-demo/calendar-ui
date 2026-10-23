import { LOCAL_TZ } from './utils/dates';

const BASE = 'http://localhost:8000';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function errorMessage(detail, fallback) {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map(d => d.msg).filter(Boolean).join('; ') || fallback;
  return fallback;
}

async function request(path, { method = 'GET', body, failure } = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(`${failure}: could not reach the server.`, 0);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(`${failure}: ${errorMessage(data?.detail, res.statusText || `HTTP ${res.status}`)}`, res.status);
  }
  return data;
}

export function fetchEvents(start, end, tz = LOCAL_TZ) {
  return request(
    `/events?start=${start}&end=${end}&tz=${encodeURIComponent(tz)}`,
    { failure: 'Could not load events' }
  );
}

export function createEvent(data) {
  return request('/events', { method: 'POST', body: data, failure: 'Could not create event' });
}

export function updateEvent(id, data) {
  return request(`/events/${id}`, { method: 'PUT', body: data, failure: 'Could not save event' });
}

export function updateOccurrence(id, date, data) {
  return request(`/events/${id}/occurrence/${date}`, {
    method: 'PUT', body: data, failure: 'Could not save event',
  });
}

export function updateSeries(id, data) {
  return request(`/events/${id}/series`, { method: 'PUT', body: data, failure: 'Could not save event' });
}

export function deleteEvent(id) {
  return request(`/events/${id}`, { method: 'DELETE', failure: 'Could not delete event' });
}

export function deleteOccurrence(id, date) {
  return request(`/events/${id}/occurrence/${date}`, {
    method: 'DELETE', failure: 'Could not delete event',
  });
}
