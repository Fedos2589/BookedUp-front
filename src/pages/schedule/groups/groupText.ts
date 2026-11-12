export const DESCRIPTION_LINES = 3

const clock = (minute: number) => {
  const m = ((minute % 1440) + 1440) % 1440
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

// ISO weekday (1 = Monday) as a short name. 2024-01-01 is a Monday; the day
// is a calendar day, so it is formatted as UTC.
const weekdayShort = (weekday: number, language: string) =>
  new Intl.DateTimeFormat(language, {
    timeZone: 'UTC',
    weekday: 'short',
  }).format(new Date(Date.UTC(2024, 0, weekday)))

// "Tue, Thu · 15:00–16:00"; the seats go after it, they need a plural.
export function whenText(
  group: { weekdays: number[]; startMinute: number; durationMinutes: number },
  language: string,
) {
  const days = group.weekdays.map((d) => weekdayShort(d, language)).join(', ')
  const start = clock(group.startMinute)
  const end = clock(group.startMinute + group.durationMinutes)
  return `${days} · ${start}–${end}`
}

// The first lines of a description, and whether the rest is hidden.
export function collapsed(description: string) {
  const lines = description.split('\n')
  return {
    text: lines.slice(0, DESCRIPTION_LINES).join('\n'),
    hasMore: lines.length > DESCRIPTION_LINES,
  }
}
