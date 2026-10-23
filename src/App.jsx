import { useState, useEffect, useCallback } from 'react';
import CalendarHeader from './components/CalendarHeader';
import WeekGrid from './components/WeekGrid';
import EventModal from './components/EventModal';
import RecurrencePrompt from './components/RecurrencePrompt';
import SignIn from './components/SignIn';
import { getWeekStart, nextWeek, prevWeek, formatDate, LOCAL_TZ } from './utils/dates';
import * as api from './api';
import { getSession, clearSession, subscribe } from './session';
import './App.css';

function tokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [session, setSessionState] = useState(getSession);

  useEffect(() => {
    // Sign-in, sign-out, and rejected tokens in this or any other tab.
    const unsubscribe = subscribe(() => setSessionState(getSession()));

    // A page restored from the back/forward cache keeps its old screen; re-check
    // the stored session so a signed-out page never shows the previous events.
    function handlePageShow(e) {
      if (e.persisted) setSessionState(getSession());
    }
    window.addEventListener('pageshow', handlePageShow);
    return () => {
      unsubscribe();
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  // Drop the session when the token expires, even if no request is made.
  useEffect(() => {
    if (!session) return;
    const expiresAt = tokenExpiry(session.token);
    if (!expiresAt) return;
    const timer = setTimeout(() => setSessionState(getSession()), Math.max(0, expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [session]);

  function handleSignOut() {
    clearSession();
    setSessionState(null);
  }

  if (!session) return <SignIn />;

  // Keyed by identity so a different person never inherits the previous
  // person's events, modal, or prompt state.
  return (
    <Calendar
      key={`${session.userId}:${session.token}`}
      username={session.username}
      onSignOut={handleSignOut}
    />
  );
}

function Calendar({ username, onSignOut }) {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modal state
  const [modalEvent, setModalEvent] = useState(null);
  const [modalSlot, setModalSlot] = useState(null);

  // Recurrence prompt state
  const [prompt, setPrompt] = useState(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const start = formatDate(weekStart);
      const end = new Date(weekStart);
      end.setDate(end.getDate() + 7);
      const data = await api.fetchEvents(start, formatDate(end));
      setEvents(data);
      setError(null);
    } catch (e) {
      // A rejected token clears the session and App returns to sign-in.
      if (e instanceof api.AuthError) return;
      setError('Could not load events. Please try again.');
    }
    setLoading(false);
  }, [weekStart]);

  // Run a change against the API; on failure show the error and reload so the
  // calendar reflects what is actually saved.
  async function mutate(fn) {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof api.AuthError) return;
      setError(e.message || 'Could not save your change.');
      return null;
    }
  }

  useEffect(() => { loadEvents(); }, [loadEvents]);

  function handlePrev() { setWeekStart(prevWeek(weekStart)); }
  function handleNext() { setWeekStart(nextWeek(weekStart)); }
  function handleToday() { setWeekStart(getWeekStart(new Date())); }

  function handleSlotClick(time) {
    setModalSlot(time);
    setModalEvent(null);
  }

  function handleEventClick(event) {
    setModalEvent(event);
    setModalSlot(null);
  }

  function closeModal() {
    setModalEvent(null);
    setModalSlot(null);
  }

  async function handleSave(data) {
    if (modalEvent) {
      if (modalEvent.is_recurring) {
        setPrompt({ action: 'edit', event: modalEvent, payload: data });
        closeModal();
        return;
      }
      await mutate(() => api.updateEvent(modalEvent.id, data));
    } else {
      const body = {
        title: data.title,
        start: data.start,
        end: data.end,
        timezone: LOCAL_TZ,
      };
      if (data.recurrence) body.recurrence = data.recurrence;
      const result = await mutate(() => api.createEvent(body));
      if (result?.conflicts && result.conflicts.length > 0) {
        alert(`Note: This event conflicts with ${result.conflicts.length} existing event(s).`);
      }
    }
    closeModal();
    loadEvents();
  }

  function handleDelete(event) {
    closeModal();
    if (event.is_recurring) {
      setPrompt({ action: 'delete', event, payload: null });
    } else {
      performDelete(event, 'all');
    }
  }

  function handleDrop(dragData, newStart) {
    const event = events.find(
      e => e.id === dragData.eventId &&
      (e.original_date === dragData.originalDate || (!e.original_date && !dragData.originalDate))
    );
    if (!event) return;

    const endDate = new Date(newStart);
    endDate.setHours(endDate.getHours() + Math.floor(dragData.duration));
    endDate.setMinutes(endDate.getMinutes() + (dragData.duration % 1) * 60);

    const payload = {
      title: event.title,
      start: formatISOLocal(newStart),
      end: formatISOLocal(endDate),
    };

    if (event.is_recurring) {
      setPrompt({ action: 'move', event, payload });
    } else {
      mutate(() => api.updateEvent(event.id, payload)).then(loadEvents);
    }
  }

  async function handlePromptSelect(scope) {
    const { action, event, payload } = prompt;
    setPrompt(null);

    if (action === 'delete') {
      await performDelete(event, scope);
    } else {
      await performEdit(event, payload, scope);
    }
    loadEvents();
  }

  async function performDelete(event, scope) {
    if (scope === 'this') {
      await mutate(() => api.deleteOccurrence(event.id, event.original_date));
    } else if (scope === 'future') {
      await mutate(() => api.updateSeries(event.id, { from_date: event.original_date, title: event.title }));
      // After splitting, delete the new series
    } else {
      await mutate(() => api.deleteEvent(event.id));
    }
    loadEvents();
  }

  async function performEdit(event, payload, scope) {
    if (scope === 'this') {
      await mutate(() => api.updateOccurrence(event.id, event.original_date, payload));
    } else if (scope === 'future') {
      await mutate(() => api.updateSeries(event.id, { ...payload, from_date: event.original_date }));
    } else {
      await mutate(() => api.updateEvent(event.id, payload));
    }
  }

  function formatISOLocal(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d}T${h}:${min}:00`;
  }

  return (
    <div className="app">
      <CalendarHeader
        weekStart={weekStart}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        username={username}
        onSignOut={onSignOut}
      />
      {loading && <div className="loading-bar" />}
      {error && (
        <div className="error-banner" role="alert">
          {error}
          <button className="btn-link" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
      <WeekGrid
        weekStart={weekStart}
        events={events}
        onSlotClick={handleSlotClick}
        onEventClick={handleEventClick}
        onDrop={handleDrop}
      />
      {(modalEvent || modalSlot) && (
        <EventModal
          event={modalEvent}
          slotTime={modalSlot}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={closeModal}
        />
      )}
      {prompt && (
        <RecurrencePrompt
          action={prompt.action}
          onSelect={handlePromptSelect}
          onCancel={() => setPrompt(null)}
        />
      )}
    </div>
  );
}
