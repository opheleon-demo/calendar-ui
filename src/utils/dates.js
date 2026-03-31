import { startOfWeek, endOfWeek, addWeeks, addDays, format, parseISO } from 'date-fns';

export function getWeekStart(date) {
  return startOfWeek(date, { weekStartsOn: 1 }); // Monday
}

export function getWeekEnd(date) {
  return endOfWeek(date, { weekStartsOn: 1 });
}

export function getWeekDays(weekStart) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function nextWeek(weekStart) {
  return addWeeks(weekStart, 1);
}

export function prevWeek(weekStart) {
  return addWeeks(weekStart, -1);
}

export function formatDate(date) {
  return format(date, 'yyyy-MM-dd');
}

export function formatTime(date) {
  return format(date, 'HH:mm');
}

export function formatDayHeader(date) {
  return format(date, 'EEE M/d');
}

export function parseEventTime(isoStr) {
  // Handle both "Z" suffix and bare ISO strings
  return parseISO(isoStr.replace('Z', ''));
}

export const HOUR_START = 7;
export const HOUR_END = 21;
export const SLOT_HEIGHT = 48; // px per hour
