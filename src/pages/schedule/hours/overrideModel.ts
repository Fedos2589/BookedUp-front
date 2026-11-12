import { clockOfMinute } from '@/dates'
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

// "09:00–12:00, 14:00–18:00"; null for a day off.
export function intervalsText(windows: readonly OverrideWindow[]) {
  if (windows.length === 0) return null
  return windows
    .map(
      (w) =>
        `${clockOfMinute(w.startMinute)}–${clockOfMinute(w.startMinute + w.durationMinutes)}`,
    )
    .join(', ')
}
