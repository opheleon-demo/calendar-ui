import { useState, useEffect } from 'react';

const FREQ_OPTIONS = [
  { value: '', label: 'Does not repeat' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY', label: 'Yearly' },
];

const DAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function EventModal({ event, slotTime, onSave, onDelete, onClose }) {
  const isEditing = !!event;

  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [freq, setFreq] = useState('');
  const [interval, setInterval] = useState(1);
  const [byday, setByday] = useState([]);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      const s = new Date(event.start.replace('Z', ''));
      const e = new Date(event.end.replace('Z', ''));
      setStartDate(formatDateInput(s));
      setStartTime(formatTimeInput(s));
      setEndTime(formatTimeInput(e));
      // Don't show recurrence options when editing (use the prompt instead)
      setFreq('');
    } else if (slotTime) {
      setTitle('');
      setStartDate(formatDateInput(slotTime));
      setStartTime(formatTimeInput(slotTime));
      const end = new Date(slotTime);
      end.setHours(end.getHours() + 1);
      setEndTime(formatTimeInput(end));
      setFreq('');
      setInterval(1);
      setByday([]);
    }
  }, [event, slotTime]);

  function formatDateInput(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function formatTimeInput(d) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function toggleDay(day) {
    setByday(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const data = {
      title,
      start: `${startDate}T${startTime}:00`,
      end: `${startDate}T${endTime}:00`,
    };
    if (!isEditing && freq) {
      data.recurrence = { freq, interval };
      if (freq === 'WEEKLY' && byday.length > 0) {
        data.recurrence.byday = byday.join(',');
      }
    }
    onSave(data);
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

          <div className="modal-actions">
            {isEditing && (
              <button type="button" className="btn btn-danger" onClick={() => onDelete(event)}>
                Delete
              </button>
            )}
            <div className="modal-actions-right">
              <button type="button" className="btn" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary">
                {isEditing ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
