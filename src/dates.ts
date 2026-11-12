import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

// The back stores and sends UTC; the app shows it in the business's time zone,
// never the browser's (AGENTS.md). Every date shown goes through here.
// Arithmetic and numeric formats are dayjs; a month's name is Intl
// (dateTimeIn), worded in the app's language without loading dayjs locales.
dayjs.extend(utc)
dayjs.extend(timezone)

// The wall-clock time (24h) in an IANA time zone at a given moment; undefined
// when this browser's Intl does not know the zone (an older ICU than the
// back's, which named it) — show the zone's name without a time then.
export function timeIn(moment: Date, timeZone: string): string | undefined {
  try {
    return dayjs(moment).tz(timeZone).format('HH:mm')
  } catch (error) {
    if (error instanceof RangeError) return undefined
    throw error
  }
}

// A day and a time ("Nov 19, 03:30") in an IANA time zone, worded in the
// app's language; undefined for a zone this browser doesn't know, as timeIn.
export function dateTimeIn(
  moment: Date,
  timeZone: string,
  language: string,
): string | undefined {
  try {
    return new Intl.DateTimeFormat(language, {
      timeZone,
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(moment)
  } catch (error) {
    if (error instanceof RangeError) return undefined
    throw error
  }
}

// The calendar day ("2026-11-13") on the business's clock; undefined for a zone
// this browser does not know, as timeIn.
export function dateIn(moment: Date, timeZone: string): string | undefined {
  try {
    return dayjs(moment).tz(timeZone).format('YYYY-MM-DD')
  } catch (error) {
    if (error instanceof RangeError) return undefined
    throw error
  }
}

// A calendar day has no time zone: format it as UTC so no zone shifts it.
export const dayLabel = (date: string, language: string): string =>
  new Intl.DateTimeFormat(language, {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${date}T00:00:00Z`))

// A calendar day plus days, as a calendar day: stepped in UTC so no zone's
// DST night shifts it.
export const addDays = (date: string, days: number): string =>
  dayjs.utc(date).add(days, 'day').format('YYYY-MM-DD')

// The first moment of a calendar day on the business's clock (00:00, or the
// first hour that exists where DST skips midnight); undefined for a zone this
// browser does not know, as timeIn.
export function startOfDayIn(date: string, timeZone: string) {
  try {
    return dayjs.tz(`${date} 00:00`, timeZone)
  } catch (error) {
    if (error instanceof RangeError) return undefined
    throw error
  }
}

// Minutes after midnight on a business's clock as "HH:MM"; 1440 is the next
// midnight, shown as 00:00.
export const clockOfMinute = (minute: number): string => {
  const m = ((minute % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

// ISO weekday (1 = Monday … 7 = Sunday) as a short name. A weekday has no
// time zone: 2024-01-01 is a Monday, formatted as UTC.
export const weekdayLabel = (weekday: number, language: string): string =>
  new Intl.DateTimeFormat(language, {
    timeZone: 'UTC',
    weekday: 'short',
  }).format(new Date(Date.UTC(2024, 0, weekday)))

// The native time field has no 24:00 (kit usage.md): an end typed at or
// before the start means the next day. Equal stays as typed — a slip the
// caller reports, not a 24-hour window.
export const endFromInput = (start: number, typed: number): number =>
  typed >= start ? typed : typed + 1440

// The end of a window running into the next day, as the field shows it.
export const endToInput = (end: number): number => end % 1440

// A wall-clock minute of a calendar day on the business's clock, as an UTC
// instant ("…Z"). A minute past 1439 is on the following day (an end after
// midnight); undefined for a zone this browser does not know, as timeIn.
export function instantOf(
  date: string,
  minute: number,
  timeZone: string,
): string | undefined {
  const day = addDays(date, Math.floor(minute / 1440))
  try {
    return dayjs.tz(`${day} ${clockOfMinute(minute)}`, timeZone).toISOString()
  } catch (error) {
    if (error instanceof RangeError) return undefined
    throw error
  }
}
