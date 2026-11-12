import { addDays, dateIn, dateTimeIn, dayLabel, startOfDayIn } from '@/dates'

// Time off is an instant range; people think in days. «From the 16th to the
// 20th» (both included) is midnight of the 16th to midnight of the 21st on the
// business's clock — computed per zone, so a DST night doesn't shift an end.

export type TimeOffRange =
  | { kind: 'days'; from: string; to: string }
  | { kind: 'times'; startsAt: Date; endsAt: Date }

// undefined for a zone this browser's Intl doesn't know (as dates.ts).
export function instantsOfRange(from: string, to: string, timeZone: string) {
  const start = startOfDayIn(from, timeZone)
  const end = startOfDayIn(addDays(to, 1), timeZone)
  return start && end
    ? { startsAt: start.toISOString(), endsAt: end.toISOString() }
    : undefined
}

// The calendar day an instant opens, or undefined when it is not the first
// moment of its day (or the zone is unknown).
function dayItOpens(instant: string, timeZone: string) {
  const date = dateIn(new Date(instant), timeZone)
  const first = date && startOfDayIn(date, timeZone)
  return date && first && first.valueOf() === Date.parse(instant)
    ? date
    : undefined
}

// Whole days when both ends sit on the business's midnights, else the times
// (a record made outside this form, or in a zone this browser doesn't know).
export function rangeOfInstants(
  startsAt: string,
  endsAt: string,
  timeZone: string,
): TimeOffRange {
  const times: TimeOffRange = {
    kind: 'times',
    startsAt: new Date(startsAt),
    endsAt: new Date(endsAt),
  }
  const from = dayItOpens(startsAt, timeZone)
  const next = dayItOpens(endsAt, timeZone)
  if (!from || !next) return times
  const to = addDays(next, -1)
  return to < from ? times : { kind: 'days', from, to }
}

// "Nov 16 – Nov 20" (days: «Mon, Nov 16» style as the dates list) or, off the
// midnights, "Nov 16, 05:30 – Nov 16, 10:00"; the UTC instants as a last
// resort for a zone this browser doesn't know.
export function rangeText(
  range: TimeOffRange,
  language: string,
  timeZone: string,
): string {
  if (range.kind === 'days') {
    const day = (date: string) => dayLabel(date, language)
    return range.from === range.to
      ? day(range.from)
      : `${day(range.from)} – ${day(range.to)}`
  }
  const at = (moment: Date) =>
    dateTimeIn(moment, timeZone, language) ?? moment.toISOString()
  return `${at(range.startsAt)} – ${at(range.endsAt)}`
}
