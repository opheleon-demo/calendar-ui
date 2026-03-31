import { useMemo } from 'react';
import { getWeekDays, formatDayHeader, formatDate, HOUR_START, HOUR_END, SLOT_HEIGHT, parseEventTime } from '../utils/dates';
import EventBlock from './EventBlock';

const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

function computeOverlaps(events) {
  // Group overlapping events for side-by-side rendering
  const sorted = [...events].sort((a, b) => {
    const aStart = parseEventTime(a.start);
    const bStart = parseEventTime(b.start);
    return aStart - bStart;
  });
  const groups = [];
  for (const ev of sorted) {
    const evStart = parseEventTime(ev.start);
    const evEnd = parseEventTime(ev.end);
    let placed = false;
    for (const group of groups) {
      const lastEnd = parseEventTime(group[group.length - 1].end);
      if (evStart < lastEnd) {
        group.push(ev);
        placed = true;
        break;
      }
    }
    if (!placed) groups.push([ev]);
  }
  // Flatten with overlap metadata
  const result = new Map();
  for (const group of groups) {
    group.forEach((ev, i) => {
      result.set(ev, { offset: i, total: group.length });
    });
  }
  return result;
}

export default function WeekGrid({ weekStart, events, onSlotClick, onEventClick, onDrop }) {
  const days = getWeekDays(weekStart);

  const eventsByDay = useMemo(() => {
    const map = {};
    days.forEach((day, i) => {
      const dateStr = formatDate(day);
      map[i] = events.filter(ev => {
        const evDate = parseEventTime(ev.start);
        const evDateStr = `${evDate.getFullYear()}-${String(evDate.getMonth() + 1).padStart(2, '0')}-${String(evDate.getDate()).padStart(2, '0')}`;
        return evDateStr === dateStr;
      });
    });
    return map;
  }, [events, weekStart]);

  function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('slot-drag-over');
  }

  function handleDragLeave(e) {
    e.currentTarget.classList.remove('slot-drag-over');
  }

  function handleDrop(dayIndex, hour, e) {
    e.preventDefault();
    e.currentTarget.classList.remove('slot-drag-over');
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      const day = days[dayIndex];
      // Snap to 30-min: use the mouse Y position within the cell
      const rect = e.currentTarget.getBoundingClientRect();
      const yOffset = e.clientY - rect.top;
      const minutes = yOffset > rect.height / 2 ? 30 : 0;
      const newStart = new Date(day);
      newStart.setHours(hour, minutes, 0, 0);
      onDrop(data, newStart);
    } catch { /* invalid drag data */ }
  }

  function handleSlotClick(dayIndex, hour, e) {
    const day = days[dayIndex];
    const rect = e.currentTarget.getBoundingClientRect();
    const yOffset = e.clientY - rect.top;
    const minutes = yOffset > rect.height / 2 ? 30 : 0;
    const slotTime = new Date(day);
    slotTime.setHours(hour, minutes, 0, 0);
    onSlotClick(slotTime);
  }

  return (
    <div className="week-grid">
      {/* Header row */}
      <div className="grid-header">
        <div className="time-gutter-header"></div>
        {days.map((day, i) => (
          <div key={i} className="day-header">
            {formatDayHeader(day)}
          </div>
        ))}
      </div>

      {/* Body */}
      <div className="grid-body">
        {/* Time labels */}
        <div className="time-gutter">
          {HOURS.map(h => (
            <div key={h} className="time-label" style={{ height: `${SLOT_HEIGHT}px` }}>
              {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day, dayIdx) => {
          const dayEvents = eventsByDay[dayIdx] || [];
          const overlaps = computeOverlaps(dayEvents);
          return (
            <div key={dayIdx} className="day-column">
              {HOURS.map(h => (
                <div
                  key={h}
                  className="time-slot"
                  style={{ height: `${SLOT_HEIGHT}px` }}
                  onClick={(e) => handleSlotClick(dayIdx, h, e)}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(dayIdx, h, e)}
                />
              ))}
              {/* Events overlay */}
              <div className="events-overlay">
                {dayEvents.map((ev, i) => {
                  const meta = overlaps.get(ev) || { offset: 0, total: 1 };
                  return (
                    <EventBlock
                      key={`${ev.id}-${ev.original_date || i}`}
                      event={ev}
                      dayIndex={dayIdx}
                      onClick={onEventClick}
                      offsetIndex={meta.offset}
                      totalOverlaps={meta.total}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
