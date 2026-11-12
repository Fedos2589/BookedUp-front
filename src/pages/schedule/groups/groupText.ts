import { clockOfMinute, weekdayLabel } from '@/dates'

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
