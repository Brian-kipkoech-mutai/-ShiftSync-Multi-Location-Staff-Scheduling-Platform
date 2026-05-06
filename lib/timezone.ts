import { toZonedTime, fromZonedTime, format as tzFormat } from "date-fns-tz";
import { format, addDays, startOfDay, endOfDay } from "date-fns";

export function toUtc(localDatetime: Date, timezone: string): Date {
  return fromZonedTime(localDatetime, timezone);
}

export function toZoned(utcDatetime: Date, timezone: string): Date {
  return toZonedTime(utcDatetime, timezone);
}

export function formatForLocation(utcDatetime: Date, timezone: string): string {
  const zoned = toZonedTime(utcDatetime, timezone);
  return tzFormat(zoned, "h:mm a zzz", { timeZone: timezone });
}

export function formatDateForLocation(utcDatetime: Date, timezone: string): string {
  const zoned = toZonedTime(utcDatetime, timezone);
  return tzFormat(zoned, "EEE, MMM d", { timeZone: timezone });
}

export function formatRangeForLocation(
  startUtc: Date,
  endUtc: Date,
  timezone: string
): string {
  const isOvernight = isOvernightShift(startUtc, endUtc, timezone);
  const startStr = formatForLocation(startUtc, timezone);
  const endStr = formatForLocation(endUtc, timezone);
  return isOvernight ? `${startStr} – ${endStr} (+1)` : `${startStr} – ${endStr}`;
}

export function isOvernightShift(
  startUtc: Date,
  endUtc: Date,
  timezone: string
): boolean {
  const startZoned = toZonedTime(startUtc, timezone);
  const endZoned = toZonedTime(endUtc, timezone);
  const startDay = format(startZoned, "yyyy-MM-dd");
  const endDay = format(endZoned, "yyyy-MM-dd");
  return startDay !== endDay;
}

export function getAvailabilityInUtc(
  window: { dayOfWeek: number; startTime: string; endTime: string },
  userHomeTimezone: string,
  targetDate: Date
): { startUtc: Date; endUtc: Date } {
  // targetDate should be a date in the location's timezone for the day we're checking
  // We parse start/end time strings ("HH:MM") as local time in the user's home timezone
  const [startHour, startMin] = window.startTime.split(":").map(Number);
  const [endHour, endMin] = window.endTime.split(":").map(Number);

  // Build a local date string using the user's home timezone
  const localDateStr = format(toZonedTime(targetDate, userHomeTimezone), "yyyy-MM-dd");

  const startLocal = new Date(`${localDateStr}T${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}:00`);
  const endLocal = new Date(`${localDateStr}T${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}:00`);

  const startUtc = fromZonedTime(startLocal, userHomeTimezone);
  let endUtc = fromZonedTime(endLocal, userHomeTimezone);

  // Handle overnight availability window (e.g. 22:00–02:00)
  if (endUtc <= startUtc) {
    endUtc = addDays(endUtc, 1);
  }

  return { startUtc, endUtc };
}

export function getWeekBounds(
  date: Date,
  timezone: string
): { start: Date; end: Date } {
  // Week is Mon–Sun
  const zoned = toZonedTime(date, timezone);
  const dayOfWeek = zoned.getDay(); // 0=Sun, 1=Mon, ...
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const mondayZoned = addDays(startOfDay(zoned), -daysFromMonday);
  const sundayZoned = addDays(mondayZoned, 6);

  return {
    start: fromZonedTime(mondayZoned, timezone),
    end: fromZonedTime(endOfDay(sundayZoned), timezone),
  };
}

export function getDayBounds(
  date: Date,
  timezone: string
): { start: Date; end: Date } {
  const zoned = toZonedTime(date, timezone);
  const dayStart = startOfDay(zoned);
  const dayEnd = endOfDay(zoned);

  return {
    start: fromZonedTime(dayStart, timezone),
    end: fromZonedTime(dayEnd, timezone),
  };
}

export function isPremiumShift(startUtc: Date, timezone: string): boolean {
  const zoned = toZonedTime(startUtc, timezone);
  const dayOfWeek = zoned.getDay(); // 0=Sun, 6=Sat, 5=Fri
  const hour = zoned.getHours();
  const isFriOrSat = dayOfWeek === 5 || dayOfWeek === 6;
  return isFriOrSat && hour >= 17 && hour < 24;
}
