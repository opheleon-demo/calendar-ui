import { useState, useEffect, useCallback } from 'react';
import CalendarHeader from './components/CalendarHeader';
import WeekGrid from './components/WeekGrid';
import EventModal from './components/EventModal';
import RecurrencePrompt from './components/RecurrencePrompt';
import ZoomSettings from './components/ZoomSettings';
import { getWeekStart, nextWeek, prevWeek, formatDate, LOCAL_TZ } from './utils/dates';
import * as api from './api';
import { readZoomRedirect, clearZoomRedirect, RECONNECT_TEXT } from './zoom';
import './App.css';

export default function App({ onSignOut }) {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal state
  const [modalEvent, setModalEvent] = useState(null);
  const [modalSlot, setModalSlot] = useState(null);

  // Recurrence prompt state
  const [prompt, setPrompt] = useState(null);

  // Result of the last save/delete that needs the user's attention, e.g.
  // "Zoom link was not created". The event itself was saved.
  const [notice, setNotice] = useState(null);

  // Zoom connection state. Returning from Zoom's consent screen lands here with
  // the result in the URL, so open the settings to show it.
  const [zoomStatus, setZoomStatus] = useState(null);
  const [zoomNotice, setZoomNotice] = useState(readZoomRedirect);
  const [showZoomSettings, setShowZoomSettings] = useState(zoomNotice !== null);

  useEffect(() => { clearZoomRedirect(); }, []);

  const loadZoomStatus = useCallback(() => {
    api.fetchZoomStatus()
      .then(setZoomStatus)
      .catch(e => console.error('Failed to load Zoom status:', e));
  }, []);

  useEffect(() => { loadZoomStatus(); }, [loadZoomStatus]);

  function openZoomSettings() {
    setShowZoomSettings(true);
    loadZoomStatus();
  }

  function closeZoomSettings() {
    setShowZoomSettings(false);
    setZoomNotice(null);
  }

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

  function openZoomFromModal() {
    closeModal();
    openZoomSettings();
  }

  // Surface a Zoom problem from a save/delete response. The calendar change
  // itself succeeded, so this is a notice rather than an error.
  function reportZoomResult(result) {
    const zoomError = result?.zoom_error;
    if (!zoomError) return;
    setNotice({ kind: 'warning', text: zoomError.message });
    if (zoomError.code === 'reconnect_required' || zoomError.code === 'not_connected') {
      loadZoomStatus();
    }
  }

  // Resolves once the request finishes; EventModal disables its buttons until
  // then and shows the error if it throws.
  async function handleSave(data) {
    setNotice(null);
    if (modalEvent) {
      if (modalEvent.is_recurring) {
        setPrompt({ action: 'edit', event: modalEvent, payload: data });
        closeModal();
        return;
      }
      reportZoomResult(await api.updateEvent(modalEvent.id, data));
    } else {
      const body = {
        title: data.title,
        start: data.start,
        end: data.end,
        timezone: LOCAL_TZ,
        create_zoom_meeting: data.create_zoom_meeting,
        idempotency_key: data.idempotency_key,
      };
      if (data.recurrence) body.recurrence = data.recurrence;
      const result = await api.createEvent(body);
      reportZoomResult(result);
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
      api.updateEvent(event.id, payload)
        .then(reportZoomResult)
        .catch(e => setNotice({ kind: 'error', text: e.message }))
        .then(loadEvents);
    }
  }

  async function handlePromptSelect(scope) {
    const { action, event, payload } = prompt;
    setPrompt(null);
    setNotice(null);

    try {
      if (action === 'delete') {
        await performDelete(event, scope);
      } else {
        await performEdit(event, payload, scope);
      }
    } catch (e) {
      setNotice({ kind: 'error', text: e.message });
    }
    loadEvents();
  }

  async function performDelete(event, scope) {
    if (scope === 'this') {
      await api.deleteOccurrence(event.id, event.original_date);
    } else if (scope === 'future') {
      // Split off this and later occurrences (without a Zoom meeting), then delete them.
      const split = await api.updateSeries(event.id, {
        from_date: event.original_date, create_zoom_meeting: false,
      });
      if (split?.id) reportZoomResult(await api.deleteEvent(split.id));
    } else {
      reportZoomResult(await api.deleteEvent(event.id));
    }
    loadEvents();
  }

  async function performEdit(event, payload, scope) {
    if (scope === 'this') {
      // Occurrences share the series' Zoom meeting, so the toggle doesn't apply here.
      const { create_zoom_meeting: _ignored, ...occurrencePayload } = payload;
      await api.updateOccurrence(event.id, event.original_date, occurrencePayload);
    } else if (scope === 'future') {
      reportZoomResult(await api.updateSeries(event.id, { ...payload, from_date: event.original_date }));
    } else {
      reportZoomResult(await api.updateEvent(event.id, payload));
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
        onOpenZoom={openZoomSettings}
        onSignOut={onSignOut}
      />
      {zoomStatus?.status === 'reconnect_required' && !showZoomSettings && (
        <div className="notice notice-warning banner">
          <span>{RECONNECT_TEXT}</span>
          <button className="btn" onClick={openZoomSettings}>Reconnect</button>
        </div>
      )}
      {notice && (
        <div className={`notice notice-${notice.kind} banner`}>
          <span>{notice.text}</span>
          <button className="btn" onClick={() => setNotice(null)}>Dismiss</button>
        </div>
      )}
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
          zoomStatus={zoomStatus}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={closeModal}
          onConnectZoom={openZoomFromModal}
        />
      )}
      {showZoomSettings && (
        <ZoomSettings
          status={zoomStatus}
          notice={zoomNotice}
          onStatusChange={setZoomStatus}
          onClose={closeZoomSettings}
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
