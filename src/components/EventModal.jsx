import { useState, useEffect } from 'react';
import { draftKey, readDraft } from '../draft';
import { LOCAL_TZ } from '../utils/dates';

const FREQ_OPTIONS = [
  { value: '', label: 'Does not repeat' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY', label: 'Yearly' },
];

const DAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function EventModal({ event, slotTime, onSave, onDelete, onClose, username, zoomConnected, onConnectZoom }) {
  const isEditing = !!event;

  const [initial] = useState(() => {
    if (!event) {
      const saved = readDraft(username);
      if (saved) return saved;
    }
    const start = event ? new Date(event.start) : slotTime;
    const end = event ? new Date(event.end) : new Date(start.getTime() + 3600000);
    return { title: event?.title || '', startDate: formatDateInput(start),
      startTime: formatTimeInput(start), endTime: formatTimeInput(end), freq: '',
      interval: 1, byday: [], count: 10, requestKey: crypto.randomUUID(), sent: false,
      slotTime: start.toISOString() };
  });
  const [title, setTitle] = useState(initial.title);
  const [startDate, setStartDate] = useState(initial.startDate);
  const [startTime, setStartTime] = useState(initial.startTime);
  const [endTime, setEndTime] = useState(initial.endTime);
  const [freq, setFreq] = useState(initial.freq);
  const [interval, setInterval] = useState(initial.interval);
  const [byday, setByday] = useState(initial.byday);
  const [count, setCount] = useState(initial.count);
  const [sent, setSent] = useState(initial.sent);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isEditing && !saved) sessionStorage.setItem(draftKey(username), JSON.stringify({
      title, startDate, startTime, endTime, freq, interval, byday, count, sent,
      requestKey: initial.requestKey, slotTime: initial.slotTime,
    }));
  }, [title, startDate, startTime, endTime, freq, interval, byday, count, sent, initial, username, isEditing, saved]);

  function formatDateInput(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function formatTimeInput(d) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function toggleDay(day) {
    setByday(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy || (!isEditing && !zoomConnected)) return;
    setBusy(true);
    setError('');
    if (!isEditing) setSent(true);
    const data = {
      title,
      start: `${startDate}T${startTime}:00`,
      end: `${startDate}T${endTime}:00`,
    };
    if (!isEditing && freq) {
      data.recurrence = { freq, interval, count };
      if (freq === 'WEEKLY' && byday.length > 0) {
        data.recurrence.byday = byday.join(',');
      }
    }
    try {
      // Persist the identity before sending, so reloads and network failures reuse it.
      if (!isEditing) {
        const draft = readDraft(username) || initial;
        sessionStorage.setItem(draftKey(username), JSON.stringify({ ...draft, title, startDate, startTime,
          endTime, freq, interval, byday, count, sent: true }));
      }
      await onSave(data, initial.requestKey);
      setSaved(true);
      if (!isEditing) sessionStorage.removeItem(draftKey(username));
    } catch (error) {
      setError(error.message);
      if (error.status === 422 || error.code === 'invalid_schedule') setSent(false);
    } finally { setBusy(false); }
  }

  return (
    <div className="modal-overlay" onClick={busy ? undefined : onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>{isEditing ? 'Edit Event' : 'New Event'}</h3>
        {event?.zoom_join_url && <p><a href={event.zoom_join_url} target="_blank" rel="noreferrer">Join Zoom meeting</a></p>}
        {!isEditing && <p>Times use {LOCAL_TZ}. During DST, missing times move to the next valid time; repeated times use the earlier instant.</p>}
        {!isEditing && !zoomConnected && <p role="alert">Connect a usable Zoom account before creating this event. Your draft is kept. <button className="btn" onClick={onConnectZoom}>Connect / reconnect Zoom</button></p>}
        {error && <p role="alert">{error}</p>}
        {!isEditing && sent && <p>This draft has been submitted. Retry uses the same request to prevent duplicate meetings. Its values are locked until it is resolved. Support reference: {initial.requestKey}</p>}
        <form onSubmit={handleSubmit}>
          <fieldset disabled={busy || (!isEditing && sent)}>
          <label>
            Title
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required autoFocus />
          </label>
          <label>
            Date
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
          </label>
          <div className="time-row">
            <label>
              Start
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required />
            </label>
            <label>
              End
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required />
            </label>
          </div>

          {!isEditing && (
            <>
              <label>
                Repeat
                <select value={freq} onChange={e => setFreq(e.target.value)}>
                  {FREQ_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
              {freq && <label>Number of occurrences (1–60)
                <input type="number" min="1" max="60" value={count} onChange={e => setCount(Number(e.target.value))} required />
              </label>}
              {freq && (
                <label>
                  Every
                  <input type="number" min="1" max="52" value={interval}
                    onChange={e => setInterval(parseInt(e.target.value) || 1)} />
                  {freq === 'DAILY' ? 'day(s)' : freq === 'WEEKLY' ? 'week(s)' : freq === 'MONTHLY' ? 'month(s)' : 'year(s)'}
                </label>
              )}
              {freq === 'WEEKLY' && (
                <div className="byday-picker">
                  {DAYS.map((d, i) => (
                    <button key={d} type="button"
                      className={`day-btn ${byday.includes(d) ? 'active' : ''}`}
                      onClick={() => toggleDay(d)}>
                      {DAY_LABELS[i]}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          </fieldset>
          <div className="modal-actions">
            {isEditing && (
              <button type="button" className="btn btn-danger" onClick={() => onDelete(event)}>
                Delete
              </button>
            )}
            <div className="modal-actions-right">
              <button type="button" className="btn" disabled={busy} onClick={onClose}>Close</button>
              <button type="submit" className="btn btn-primary" disabled={busy || (!isEditing && !zoomConnected)}>
                {busy ? 'Saving…' : isEditing ? 'Save' : sent ? 'Retry creation' : 'Create'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
