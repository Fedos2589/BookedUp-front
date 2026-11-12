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
