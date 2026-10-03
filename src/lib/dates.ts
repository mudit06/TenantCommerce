// Dates are stored UTC and shown in the tenant's time zone, Asia/Kolkata by default (docs/16).
// Calendar maths (billing periods, "today") happens on the wall clock of that zone.

export const DEFAULT_TIMEZONE = 'Asia/Kolkata'

type WallClock = { year: number; month: number; day: number; hour: number; minute: number }

function wallClock(date: Date, timeZone: string): WallClock {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0)
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
  }
}

/** Minutes the zone is ahead of UTC at that instant (330 for India). */
function offsetMinutes(date: Date, timeZone: string): number {
  const wall = wallClock(date, timeZone)
  const asUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute)
  return Math.round((asUtc - Math.floor(date.getTime() / 60000) * 60000) / 60000)
}

/** The instant a wall-clock date and time happens in a zone. */
function fromWallClock(
  year: number,
  month: number,
  day: number,
  timeZone: string,
  hour = 0,
  minute = 0,
): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute))
  const offset = offsetMinutes(guess, timeZone)
  const result = new Date(guess.getTime() - offset * 60000)
  // A second pass settles zones whose offset differs on either side of the guess (DST)
  const corrected = offsetMinutes(result, timeZone)
  return corrected === offset ? result : new Date(guess.getTime() - corrected * 60000)
}

const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate()

export function startOfDay(date: Date, timeZone = DEFAULT_TIMEZONE): Date {
  const wall = wallClock(date, timeZone)
  return fromWallClock(wall.year, wall.month, wall.day, timeZone)
}

export function startOfMonth(date: Date, timeZone = DEFAULT_TIMEZONE): Date {
  const wall = wallClock(date, timeZone)
  return fromWallClock(wall.year, wall.month, 1, timeZone)
}

/** Adds calendar months on the zone's wall clock; 31 Jan + 1 month is 28/29 Feb. */
export function addMonths(date: Date, months: number, timeZone = DEFAULT_TIMEZONE): Date {
  const wall = wallClock(date, timeZone)
  const monthIndex = wall.month - 1 + months
  const year = wall.year + Math.floor(monthIndex / 12)
  const month = (((monthIndex % 12) + 12) % 12) + 1
  const day = Math.min(wall.day, daysInMonth(year, month))
  return fromWallClock(year, month, day, timeZone, wall.hour, wall.minute)
}

export function addDays(date: Date, days: number, timeZone = DEFAULT_TIMEZONE): Date {
  const wall = wallClock(date, timeZone)
  const target = new Date(Date.UTC(wall.year, wall.month - 1, wall.day + days))
  return fromWallClock(
    target.getUTCFullYear(),
    target.getUTCMonth() + 1,
    target.getUTCDate(),
    timeZone,
    wall.hour,
    wall.minute,
  )
}

/** Whole days from `from` to `to` on the zone's calendar (negative when `to` is earlier). */
export function calendarDaysBetween(from: Date, to: Date, timeZone = DEFAULT_TIMEZONE): number {
  const a = wallClock(from, timeZone)
  const b = wallClock(to, timeZone)
  const dayA = Date.UTC(a.year, a.month - 1, a.day)
  const dayB = Date.UTC(b.year, b.month - 1, b.day)
  return Math.round((dayB - dayA) / 86_400_000)
}

/** 1 Oct 2026 */
export function formatDate(date: Date | string, timeZone = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

/** Fri, 2 Oct 2026 */
export function formatDateWithWeekday(date: Date | string, timeZone = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date))
}

/** 2 Oct, 10:42 */
export function formatDateTime(date: Date | string, timeZone = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone,
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(date))
}

/** October 2026 */
export function formatMonth(date: Date | string, timeZone = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat('en-IN', { timeZone, month: 'long', year: 'numeric' }).format(
    new Date(date),
  )
}
