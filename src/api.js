import { LOCAL_TZ } from './utils/dates';

export const BASE = import.meta.env?.VITE_API_URL || 'http://localhost:8000';
const SESSION_KEY = 'calendar-session';

export function getSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); }
  catch { return null; }
}

export function setSession(session) {
  if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else sessionStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new Event('calendar-session'));
}

export async function request(path, { method = 'GET', data, headers = {} } = {}) {
  const token = getSession()?.access_token;
  const response = await fetch(`${BASE}${path}`, {
    method, credentials: 'include',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(data ? { 'Content-Type': 'application/json' } : {}), ...headers },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
  let result;
  try { result = await response.json(); }
  catch { result = null; }
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/')) setSession(null);
    const detail = result?.detail;
    const error = new Error(detail?.message || (typeof detail === 'string' ? detail : 'The request failed. Keep your draft and retry.'));
    error.code = detail?.code;
    error.status = response.status;
    throw error;
  }
  return result;
}

export async function authenticate(username, password, register = false) {
  const session = await request(`/auth/${register ? 'register' : 'login'}`, { method: 'POST', data: { username, password } });
  setSession({ ...session, username: username.trim() });
}

export const fetchEvents = (start, end, tz = LOCAL_TZ) => request(`/events?${new URLSearchParams({ start, end, tz })}`);
export const createEvent = (data, key) => request('/events', { method: 'POST', data, headers: { 'Idempotency-Key': key } });
export const updateEvent = (id, data) => request(`/events/${id}`, { method: 'PUT', data });
export const updateOccurrence = (id, date, data) => request(`/events/${id}/occurrence/${date}`, { method: 'PUT', data });
export const updateSeries = (id, data) => request(`/events/${id}/series`, { method: 'PUT', data });
export const deleteEvent = id => request(`/events/${id}`, { method: 'DELETE' });
export const deleteOccurrence = (id, date) => request(`/events/${id}/occurrence/${date}`, { method: 'DELETE' });
export const zoomStatus = () => request('/zoom/connection');
export const connectZoom = () => request('/zoom/connect', { method: 'POST' });
export const disconnectZoom = () => request('/zoom/connection', { method: 'DELETE' });
