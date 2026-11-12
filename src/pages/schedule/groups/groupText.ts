import { clockOfMinute, dateIn, dayLabel, timeIn, weekdayLabel } from '@/dates'

// "Tue, Thu · 15:00–16:00"; the seats go after it, they need a plural.
export function whenText(
  group: { weekdays: number[]; startMinute: number; durationMinutes: number },
  language: string,
) {
  const days = group.weekdays.map((d) => weekdayLabel(d, language)).join(', ')
  const start = clockOfMinute(group.startMinute)
  const end = clockOfMinute(group.startMinute + group.durationMinutes)
  return `${days} · ${start}–${end}`
}

// "Thu, Nov 19 · 15:00–16:00" on the business's clock; the UTC instants when
// this browser does not know the zone (as timeOff's rangeText).
export function sessionWhenText(
  session: { startsAt: string; endsAt: string },
  timeZone: string,
  language: string,
) {
  const start = new Date(session.startsAt)
  const end = new Date(session.endsAt)
  const date = dateIn(start, timeZone)
  const from = timeIn(start, timeZone)
  const to = timeIn(end, timeZone)
  return date && from && to
    ? `${dayLabel(date, language)} · ${from}–${to}`
    : `${session.startsAt} – ${session.endsAt}`
}
