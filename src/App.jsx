import { useState, useEffect, useCallback } from 'react';
import CalendarHeader from './components/CalendarHeader';
import WeekGrid from './components/WeekGrid';
import EventModal from './components/EventModal';
import RecurrencePrompt from './components/RecurrencePrompt';
import { getWeekStart, nextWeek, prevWeek, formatDate, LOCAL_TZ } from './utils/dates';
import * as api from './api';
import './App.css';

export default function App() {
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
    } catch (e) {
      // Never keep showing events the server would no longer return
      setEvents([]);
      setError(e.message);
    }
    setLoading(false);
  }, [weekStart]);

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

  // Runs a change against the API, then reloads so the calendar shows what
  // was actually saved. Returns false (and shows the error) if it failed.
  async function mutate(action) {
    setError(null);
    try {
      await action();
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      loadEvents();
    }
  }

  async function handleSave(data) {
    if (modalEvent?.is_recurring) {
      setPrompt({ action: 'edit', event: modalEvent, payload: data });
      closeModal();
      return;
    }
    // On failure the modal stays open so nothing typed is lost
    const ok = await mutate(async () => {
      if (modalEvent) {
        await api.updateEvent(modalEvent.id, data);
        return;
      }
      const body = {
        title: data.title,
        start: data.start,
        end: data.end,
        timezone: LOCAL_TZ,
      };
      if (data.recurrence) body.recurrence = data.recurrence;
      const result = await api.createEvent(body);
      if (result.conflicts && result.conflicts.length > 0) {
        alert(`Note: This event conflicts with ${result.conflicts.length} existing event(s).`);
      }
    });
    if (ok) closeModal();
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
      mutate(() => api.updateEvent(event.id, payload));
    }
  }

  function handlePromptSelect(scope) {
    const { action, event, payload } = prompt;
    setPrompt(null);

    if (action === 'delete') {
      performDelete(event, scope);
    } else {
      mutate(() => performEdit(event, payload, scope));
    }
  }

  function performDelete(event, scope) {
    return mutate(async () => {
      if (scope === 'this') {
        await api.deleteOccurrence(event.id, event.original_date);
      } else if (scope === 'future') {
        // Split the series at this occurrence, then delete the new tail series
        const tail = await api.updateSeries(event.id, { from_date: event.original_date, title: event.title });
        await api.deleteEvent(tail.id);
      } else {
        await api.deleteEvent(event.id);
      }
    });
  }

  async function performEdit(event, payload, scope) {
    if (scope === 'this') {
      await api.updateOccurrence(event.id, event.original_date, payload);
    } else if (scope === 'future') {
      await api.updateSeries(event.id, { ...payload, from_date: event.original_date });
    } else {
      await api.updateEvent(event.id, payload);
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
      />
      {loading && <div className="loading-bar" />}
      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button type="button" className="error-dismiss" onClick={() => setError(null)} aria-label="Dismiss">
            &times;
          </button>
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
