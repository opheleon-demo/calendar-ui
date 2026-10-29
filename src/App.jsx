import { useState, useEffect, useCallback, useRef } from 'react';
import { readDraft, draftKey } from './draft';
import Login from './components/Login';
import CalendarHeader from './components/CalendarHeader';
import WeekGrid from './components/WeekGrid';
import EventModal from './components/EventModal';
import RecurrencePrompt from './components/RecurrencePrompt';
import { getWeekStart, nextWeek, prevWeek, formatDate, LOCAL_TZ } from './utils/dates';
import * as api from './api';
import './App.css';

export default function App() {
  const [session, setSession] = useState(api.getSession);
  const [zoom, setZoom] = useState({ connected: false });
  const [message, setMessage] = useState('');
  const [connecting, setConnecting] = useState(false);
  const popupRef = useRef(null);
  const username = session?.username;

  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal state
  const [modalEvent, setModalEvent] = useState(null);
  const [modalSlot, setModalSlot] = useState(() => {
    const draft = readDraft(api.getSession()?.username);
    return draft?.slotTime ? new Date(draft.slotTime) : null;
  });

  // Recurrence prompt state
  const [prompt, setPrompt] = useState(null);

  const refreshZoom = useCallback(async () => {
    if (!username) return;
    try {
      const value = await api.zoomStatus();
      if (api.getSession()?.username === username) setZoom(value);
    }
    catch (error) { setMessage(error.message); setZoom({ connected: false }); }
  }, [username]);

  useEffect(() => {
    const changed = () => {
      setSession(api.getSession());
      setEvents([]);
      setZoom({ connected: false });
      setMessage('');
      setPrompt(null);
    };
    window.addEventListener('calendar-session', changed);
    return () => window.removeEventListener('calendar-session', changed);
  }, []);

  useEffect(() => {
    if (!username) return;
    let active = true;
    api.zoomStatus().then(value => { if (active) setZoom(value); }).catch(error => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, [username, session?.access_token]);

  useEffect(() => {
    function completed(event) {
      if (event.origin !== new URL(api.BASE).origin || event.source !== popupRef.current || event.data?.type !== 'calendar-zoom') return;
      setConnecting(false);
      if (event.data.status !== 'connected') setMessage('Zoom authorization was denied or could not be completed. Connect Zoom again before saving. Your draft is kept.');
      else setMessage('Zoom connected. You can now save your draft.');
      refreshZoom();
    }
    const focused = () => { if (username) refreshZoom(); };
    window.addEventListener('message', completed);
    window.addEventListener('focus', focused);
    return () => { window.removeEventListener('message', completed); window.removeEventListener('focus', focused); };
  }, [refreshZoom, username]);

  async function connectZoom() {
    const popup = window.open('about:blank', 'calendar-zoom', 'width=600,height=760');
    if (!popup) { setMessage('Allow popups for this calendar, then connect Zoom again.'); return; }
    popupRef.current = popup;
    setConnecting(true);
    try { const result = await api.connectZoom(); popup.location.href = result.url; }
    catch (error) { popup.close(); setMessage(error.message); setConnecting(false); }
  }

  const loadEvents = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      const start = formatDate(weekStart);
      const end = new Date(weekStart);
      end.setDate(end.getDate() + 7);
      const data = await api.fetchEvents(start, formatDate(end));
      if (api.getSession()?.access_token === session.access_token) setEvents(data);
    } catch (e) {
      setMessage(e.message);
    }
    setLoading(false);
  }, [weekStart, session]);

  useEffect(() => {
    const timer = setTimeout(() => { loadEvents(); }, 0);
    return () => clearTimeout(timer);
  }, [loadEvents]);

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

  async function handleSave(data, requestKey) {
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
        timezone: LOCAL_TZ,
      };
      if (data.recurrence) body.recurrence = data.recurrence;
      let result;
      try { result = await api.createEvent(body, requestKey); }
      catch (error) {
        if (error.code?.startsWith('zoom_')) refreshZoom();
        throw error;
      }
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
      performDelete(event, 'all').catch(error => setMessage(error.message));
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
      api.updateEvent(event.id, payload).then(loadEvents).catch(error => setMessage(error.message));
    }
  }

  async function handlePromptSelect(scope) {
    const { action, event, payload } = prompt;
    try {
      if (action === 'delete') {
        await performDelete(event, scope);
      } else {
        await performEdit(event, payload, scope);
      }
      setPrompt(null);
      loadEvents();
    } catch (error) { setMessage(error.message); }
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

  if (!session) return <Login />;

  return (
    <div className="app">
      <div className="account-bar">
        <span>Signed in as {username}</span>
        <button className="btn" onClick={() => { const draft = readDraft(username); if (draft) handleSlotClick(new Date(draft.slotTime)); }}>Resume draft</button>
        <button className="btn" onClick={() => {
          if (window.confirm('Discard this draft? If Zoom creation is pending, resume and retry it first to recover its meeting. Discarding can leave an unassociated Zoom meeting.')) {
            sessionStorage.removeItem(draftKey(username)); closeModal();
          }
        }}>Discard draft</button>
        <button className="btn" onClick={() => { closeModal(); setEvents([]); api.setSession(null); }}>Sign out</button>
        <span>{zoom.connected ? `Zoom connected (${zoom.zoom_user_id})` : 'Connect Zoom to create events'}</span>
        <button className="btn" onClick={connectZoom}>{connecting ? 'Retry Zoom connection' : zoom.connected ? 'Reconnect Zoom' : 'Connect Zoom'}</button>
        <button className="btn" onClick={refreshZoom}>Check connection</button>
        {zoom.connected && <button className="btn" onClick={async () => {
          try { await api.disconnectZoom(); setZoom({ connected: false }); }
          catch (error) { setMessage(error.message); }
        }}>Disconnect Zoom</button>}
      </div>
      {(message || zoom.message) && <p role="status">{message || zoom.message}</p>}
      <p>New events include Zoom meetings. Later calendar edits and cancellations must also be made in Zoom.</p>
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
          key={`${username}:${modalEvent?.id || modalSlot?.toISOString()}`}
          username={username}
          zoomConnected={zoom.connected}
          onConnectZoom={connectZoom}
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
