import { useState, useEffect } from 'react';
import { newIdempotencyKey } from '../utils/ids';

const FREQ_OPTIONS = [
  { value: '', label: 'Does not repeat' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY', label: 'Yearly' },
];

const DAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function EventModal({ event, slotTime, zoomStatus, onSave, onDelete, onClose, onConnectZoom }) {
  const isEditing = !!event;

  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [freq, setFreq] = useState('');
  const [interval, setInterval] = useState(1);
  const [byday, setByday] = useState([]);
  const [zoomMeeting, setZoomMeeting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  // One key per modal, so a double click or a retry of this create is a no-op.
  const [idempotencyKey] = useState(newIdempotencyKey);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      const s = new Date(event.start);
      const e = new Date(event.end);
      setStartDate(formatDateInput(s));
      setStartTime(formatTimeInput(s));
      setEndDate(formatDateInput(e));
      setEndTime(formatTimeInput(e));
      // Don't show recurrence options when editing (use the prompt instead)
      setFreq('');
      setZoomMeeting(!!event.zoom_join_url);
    } else if (slotTime) {
      setTitle('');
      setStartDate(formatDateInput(slotTime));
      setStartTime(formatTimeInput(slotTime));
      const end = new Date(slotTime);
      end.setHours(end.getHours() + 1);
      setEndDate(formatDateInput(end));
      setEndTime(formatTimeInput(end));
      setFreq('');
      setInterval(1);
      setByday([]);
      setZoomMeeting(false);
    }
  }, [event, slotTime]);

  const start = `${startDate}T${startTime}:00`;
  const end = `${endDate}T${endTime}:00`;
  // Same-format local ISO strings compare correctly as strings.
  const endBeforeStart = !!(startDate && startTime && endDate && endTime) && end <= start;
  const zoomConnected = zoomStatus?.status === 'connected';
  // Hide Zoom entirely until we know the status, or when the server has no Zoom app.
  const showZoom = !!zoomStatus && (zoomStatus.configured || zoomStatus.status !== 'not_connected');

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
    if (saving || endBeforeStart) return;
    const data = { title, start, end };
    if (!isEditing && freq) {
      data.recurrence = { freq, interval };
      if (freq === 'WEEKLY' && byday.length > 0) {
        data.recurrence.byday = byday.join(',');
      }
    }
    if (!isEditing) {
      data.idempotency_key = idempotencyKey;
      data.create_zoom_meeting = zoomConnected && zoomMeeting;
    } else if (zoomConnected && zoomMeeting !== !!event.zoom_join_url) {
      // Only send the toggle when it changed, so editing an event while Zoom
      // is disconnected never touches its saved link.
      data.create_zoom_meeting = zoomMeeting;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(data);
    } catch (err) {
      // Stay open so the user can retry; a retried create reuses idempotencyKey.
      setSaveError(`${err.message}. Please try again.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>{isEditing ? 'Edit Event' : 'New Event'}</h3>
        <form onSubmit={handleSubmit}>
          <label>
            Title
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required autoFocus />
          </label>
          <div className="time-row">
            <label>
              Start date
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
            </label>
            <label>
              Start
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} required />
            </label>
          </div>
          <div className="time-row">
            <label>
              End date
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
            </label>
            <label>
              End
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} required />
            </label>
          </div>
          {endBeforeStart && <p className="notice notice-error">The event must end after it starts.</p>}

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

          {showZoom && (
            <div className="zoom-field">
              {zoomConnected ? (
                <label className="checkbox-label">
                  <input type="checkbox" checked={zoomMeeting} onChange={e => setZoomMeeting(e.target.checked)} />
                  {isEditing ? 'Zoom meeting' : 'Create Zoom meeting'}
                </label>
              ) : (
                <div className="notice notice-info banner">
                  <span>
                    {zoomStatus.status === 'reconnect_required'
                      ? 'Reconnect Zoom to add or sync a Zoom meeting.'
                      : 'Connect Zoom to add a Zoom meeting.'}
                  </span>
                  <button type="button" className="btn" onClick={onConnectZoom}>
                    {zoomStatus.status === 'reconnect_required' ? 'Reconnect' : 'Connect Zoom'}
                  </button>
                </div>
              )}
            </div>
          )}
          {isEditing && event.zoom_join_url && (
            <p className="zoom-link">
              <a href={event.zoom_join_url} target="_blank" rel="noopener noreferrer">
                {event.zoom_join_url}
              </a>
              {zoomConnected && !zoomMeeting && <span> &mdash; will be removed when you save</span>}
            </p>
          )}

          {saveError && <p className="notice notice-error">{saveError}</p>}

          <div className="modal-actions">
            {isEditing && (
              <button type="button" className="btn btn-danger" onClick={() => onDelete(event)} disabled={saving}>
                Delete
              </button>
            )}
            <div className="modal-actions-right">
              <button type="button" className="btn" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving || endBeforeStart}>
                {saving ? 'Saving…' : isEditing ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
