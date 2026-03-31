import { format } from 'date-fns';

export default function CalendarHeader({ weekStart, onPrev, onNext, onToday }) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  return (
    <header className="calendar-header">
      <div className="header-nav">
        <button onClick={onToday} className="btn btn-today">Today</button>
        <button onClick={onPrev} className="btn btn-nav">&larr;</button>
        <button onClick={onNext} className="btn btn-nav">&rarr;</button>
      </div>
      <h2 className="header-title">
        {format(weekStart, 'MMM d')} &ndash; {format(weekEnd, 'MMM d, yyyy')}
      </h2>
    </header>
  );
}
