import { LOCAL_TZ } from './utils/dates';

const BASE = 'http://localhost:8000';

export async function fetchHealth(signal) {
  const res = await fetch(`${BASE}/health`, { signal, cache: 'no-store' });
  if (res.status !== 200) throw new Error('Health check failed');
  const body = await res.json();
  if (body?.status !== 'ok') throw new Error('Unexpected health response');
}

export async function fetchEvents(start, end, tz = LOCAL_TZ) {
  const res = await fetch(
    `${BASE}/events?start=${start}&end=${end}&tz=${encodeURIComponent(tz)}`
  );
  if (!res.ok) throw new Error('Failed to fetch events');
  return res.json();
}

export async function createEvent(data) {
  const res = await fetch(`${BASE}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateEvent(id, data) {
  const res = await fetch(`${BASE}/events/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateOccurrence(id, date, data) {
  const res = await fetch(`${BASE}/events/${id}/occurrence/${date}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateSeries(id, data) {
  const res = await fetch(`${BASE}/events/${id}/series`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteEvent(id) {
  await fetch(`${BASE}/events/${id}`, { method: 'DELETE' });
}

export async function deleteOccurrence(id, date) {
  await fetch(`${BASE}/events/${id}/occurrence/${date}`, { method: 'DELETE' });
}
