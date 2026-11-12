import dayjs from 'dayjs'

import '@/dates'
import { endToInput } from './weekEdit'
import { fromWindows, toWindows, type Week, type WindowDto } from './weekModel'

export type OverrideWindow = Pick<
  WindowDto,
  'startMinute' | 'durationMinutes' | 'slotMinutes'
>

// An override is one day's hours, so the form is the week's with only the
// first day in use: its rows, edits and validation (the ring included) are the
// week's, not a second copy.
export const weekOfOverride = (windows: readonly OverrideWindow[]): Week =>
  fromWindows(windows.map((w) => ({ ...w, weekday: 1, title: null })))

export const overrideFromWeek = (week: Week): OverrideWindow[] =>
  toWindows(week).map(({ startMinute, durationMinutes, slotMinutes }) => ({
    startMinute,
    durationMinutes,
    slotMinutes,
  }))

const clock = (minutes: number) => {
  const m = endToInput(minutes)
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

// "09:00–12:00, 14:00–18:00"; null for a day off.
export function intervalsText(windows: readonly OverrideWindow[]) {
  if (windows.length === 0) return null
  return windows
    .map(
      (w) =>
        `${clock(w.startMinute)}–${clock(w.startMinute + w.durationMinutes)}`,
    )
    .join(', ')
}

export const todayIn = (timeZone: string, now = new Date()): string =>
  dayjs(now).tz(timeZone).format('YYYY-MM-DD')

// A calendar day has no time zone: format it as UTC so no zone shifts it.
export const dayLabel = (date: string, language: string): string =>
  new Intl.DateTimeFormat(language, {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${date}T00:00:00Z`))
