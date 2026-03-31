import { parseEventTime, HOUR_START, SLOT_HEIGHT } from '../utils/dates';

export default function EventBlock({ event, dayIndex, onClick, columnWidth, offsetIndex, totalOverlaps }) {
  const start = parseEventTime(event.start);
  const end = parseEventTime(event.end);

  const startHour = start.getHours() + start.getMinutes() / 60;
  const endHour = end.getHours() + end.getMinutes() / 60;
  const top = (startHour - HOUR_START) * SLOT_HEIGHT;
  const height = Math.max((endHour - startHour) * SLOT_HEIGHT, 18);

  const width = totalOverlaps > 1 ? `${100 / totalOverlaps}%` : '100%';
  const left = totalOverlaps > 1 ? `${(offsetIndex * 100) / totalOverlaps}%` : '0';

  const isRecurring = event.is_recurring;
  const className = `event-block ${isRecurring ? 'event-recurring' : 'event-single'}`;

  function handleDragStart(e) {
    e.dataTransfer.setData('application/json', JSON.stringify({
      eventId: event.id,
      originalDate: event.original_date,
      isRecurring: event.is_recurring,
      startHour: startHour,
      duration: endHour - startHour,
    }));
    e.dataTransfer.effectAllowed = 'move';
  }

  return (
    <div
      className={className}
      style={{ top: `${top}px`, height: `${height}px`, width, left }}
      draggable
      onDragStart={handleDragStart}
      onClick={(e) => { e.stopPropagation(); onClick(event); }}
      title={`${event.title}\n${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
    >
      <span className="event-title">{event.title}</span>
    </div>
  );
}
