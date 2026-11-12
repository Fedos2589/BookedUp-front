import type { StaffScheduleControllerReplaceWeeklyBodyWindowsItem as WindowDto } from '@/api/generated.schemas'

export type { WindowDto }

const DEFAULT_SLOT = 30
export const MINUTES_PER_DAY = 1440
const WEEK = 7 * MINUTES_PER_DAY

// Minutes after midnight; `end` may pass 1440 for a window running into the
// next day (the back allows it). The title is carried, not edited here.
export type Interval = { start: number; end: number; title: string | null }
export type Day = { working: boolean; intervals: Interval[] }
// days[0] is Monday (ISO weekday 1).
export type Week = { days: Day[]; slotMinutes: number }

export type WeekError = { weekday: number } & (
  | { code: 'empty'; index?: undefined }
  | { code: 'endBeforeStart' | 'overlap' | 'slotTooLong'; index: number }
)

// The back keeps one step per window; the form has one for the week — the most
// common one, the smaller on a tie.
function commonSlot(windows: readonly WindowDto[]): number {
  const counts = new Map<number, number>()
  for (const w of windows)
    counts.set(w.slotMinutes, (counts.get(w.slotMinutes) ?? 0) + 1)
  let best = DEFAULT_SLOT
  let bestCount = 0
  for (const [slot, count] of counts)
    if (count > bestCount || (count === bestCount && slot < best)) {
      best = slot
      bestCount = count
    }
  return best
}

export function fromWindows(windows: readonly WindowDto[]): Week {
  const days: Day[] = Array.from({ length: 7 }, () => ({
    working: false,
    intervals: [],
  }))
  for (const w of windows) {
    const day = days[w.weekday - 1]
    day.working = true
    day.intervals.push({
      start: w.startMinute,
      end: w.startMinute + w.durationMinutes,
      title: w.title ?? null,
    })
  }
  for (const day of days) day.intervals.sort((a, b) => a.start - b.start)
  return { days, slotMinutes: commonSlot(windows) }
}

export function toWindows(week: Week): WindowDto[] {
  return week.days.flatMap((day, i) =>
    day.working
      ? day.intervals.map((interval) => ({
          weekday: i + 1,
          startMinute: interval.start,
          durationMinutes: interval.end - interval.start,
          slotMinutes: week.slotMinutes,
          title: interval.title,
        }))
      : [],
  )
}

type Placed = { weekday: number; index: number; start: number; end: number }

const startInWeek = (p: Placed) => (p.weekday - 1) * MINUTES_PER_DAY + p.start

// The week is a ring: Sunday night runs into Monday (the back's rule).
function overlaps(a: Placed, b: Placed): boolean {
  const aStart = startInWeek(a)
  const aLength = a.end - a.start
  return [-WEEK, 0, WEEK].some((shift) => {
    const bStart = startInWeek(b) + shift
    return aStart < bStart + (b.end - b.start) && bStart < aStart + aLength
  })
}

export function validateWeek(week: Week): WeekError[] {
  const errors: WeekError[] = []
  const checked: Placed[] = []
  week.days.forEach((day, d) => {
    const weekday = d + 1
    if (!day.working) return
    if (day.intervals.length === 0) errors.push({ weekday, code: 'empty' })
    day.intervals.forEach((interval, index) => {
      const placed = { weekday, index, ...interval }
      if (interval.end <= interval.start)
        errors.push({ weekday, index, code: 'endBeforeStart' })
      else if (checked.some((other) => overlaps(other, placed)))
        errors.push({ weekday, index, code: 'overlap' })
      else if (week.slotMinutes > interval.end - interval.start)
        errors.push({ weekday, index, code: 'slotTooLong' })
      if (interval.end > interval.start) checked.push(placed)
    })
  })
  return errors
}
