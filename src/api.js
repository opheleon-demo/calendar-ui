const BASE = 'http://localhost:8000';

export async function fetchEvents(start, end, tz = 'America/New_York') {
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
