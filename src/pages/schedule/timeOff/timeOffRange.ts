import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

import { dateTimeIn } from '@/dates'

dayjs.extend(utc)
dayjs.extend(timezone)

// Time off is an instant range; people think in days. «From the 16th to the
// 20th» (both included) is midnight of the 16th to midnight of the 21st on the
// business's clock — computed per zone, so a DST night doesn't shift an end.

export type TimeOffRange =
  | { kind: 'days'; from: string; to: string }
  | { kind: 'times'; startsAt: Date; endsAt: Date }

const midnight = (date: string, timeZone: string) =>
  dayjs.tz(`${date} 00:00`, timeZone)

// A calendar day has no zone: step it in UTC so nothing shifts it.
const addDays = (date: string, days: number) =>
  dayjs.utc(date).add(days, 'day').format('YYYY-MM-DD')

// undefined for a zone this browser's Intl doesn't know (as dates.ts).
export function instantsOfRange(from: string, to: string, timeZone: string) {
  try {
    return {
      startsAt: midnight(from, timeZone).toISOString(),
      endsAt: midnight(addDays(to, 1), timeZone).toISOString(),
    }
  } catch (error) {
    if (error instanceof RangeError) return undefined
    throw error
  }
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
  try {
    const start = dayjs(startsAt).tz(timeZone)
    const end = dayjs(endsAt).tz(timeZone)
    const onMidnight = (d: dayjs.Dayjs) => d.isSame(d.startOf('day'))
    if (!onMidnight(start) || !onMidnight(end)) return times
    const from = start.format('YYYY-MM-DD')
    const to = addDays(end.format('YYYY-MM-DD'), -1)
    return to < from ? times : { kind: 'days', from, to }
  } catch (error) {
    if (error instanceof RangeError) return times
    throw error
  }
}

// "Nov 16 – Nov 20" (days: «Mon, Nov 16» style as the dates list) or, off the
// midnights, "Nov 16, 05:30 – Nov 16, 10:00"; the UTC instants as a last
// resort for a zone this browser doesn't know.
export function rangeText(
  range: TimeOffRange,
  language: string,
  timeZone: string,
  dayText: (date: string) => string,
): string {
  if (range.kind === 'days')
    return range.from === range.to
      ? dayText(range.from)
      : `${dayText(range.from)} – ${dayText(range.to)}`
  const at = (moment: Date) =>
    dateTimeIn(moment, timeZone, language) ?? moment.toISOString()
  return `${at(range.startsAt)} – ${at(range.endsAt)}`
}
