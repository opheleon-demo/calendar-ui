import { useState, useEffect, useCallback } from 'react';
import CalendarHeader from './components/CalendarHeader';
import WeekGrid from './components/WeekGrid';
import EventModal from './components/EventModal';
import RecurrencePrompt from './components/RecurrencePrompt';
import { getWeekStart, nextWeek, prevWeek, formatDate } from './utils/dates';
import * as api from './api';
import './App.css';

export default function App() {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

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
      console.error('Failed to load events:', e);
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

  async function handleSave(data) {
    if (modalEvent) {
      if (modalEvent.is_recurring) {
        setPrompt({ action: 'edit', event: modalEvent, payload: data });
        closeModal();
        return;
      }
      await api.updateEvent(modalEvent.id, data);
    } else {
      const body = {
        title: data.title,
        start: data.start,
        end: data.end,
        timezone: 'America/New_York',
      };
      if (data.recurrence) body.recurrence = data.recurrence;
      const result = await api.createEvent(body);
      if (result.conflicts && result.conflicts.length > 0) {
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
      api.updateEvent(event.id, payload).then(loadEvents);
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
      await api.deleteOccurrence(event.id, event.original_date);
    } else if (scope === 'future') {
      await api.updateSeries(event.id, { from_date: event.original_date, title: event.title });
      // After splitting, delete the new series
    } else {
      await api.deleteEvent(event.id);
    }
    loadEvents();
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
