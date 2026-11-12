import {
  MINUTES_PER_DAY,
  type Day,
  type Interval,
  type Week,
} from './weekModel'
const DEFAULT_INTERVAL: Interval = { start: 540, end: 1080, title: null }
const NEW_INTERVAL_LENGTH = 120

// The native time field has no 24:00 (kit usage.md): an end typed at or
// before the start means the next day. Equal stays as typed — a slip the model
// reports, not a 24-hour window.
export function endFromInput(start: number, typed: number): number {
  return typed >= start ? typed : typed + MINUTES_PER_DAY
}

export const endToInput = (end: number): number => end % MINUTES_PER_DAY

function changeDay(week: Week, index: number, change: (day: Day) => Day): Week {
  return {
    ...week,
    days: week.days.map((day, i) => (i === index ? change(day) : day)),
  }
}

export function setWorking(week: Week, index: number, working: boolean): Week {
  return changeDay(week, index, (day) => ({
    working,
    intervals:
      working && day.intervals.length === 0
        ? [DEFAULT_INTERVAL]
        : day.intervals,
  }))
}

export function addInterval(week: Week, index: number): Week {
  return changeDay(week, index, (day) => {
    const last = day.intervals.at(-1)
    if (!last) return { working: true, intervals: [DEFAULT_INTERVAL] }
    // On the clock: after an interval ending at midnight the next starts at 00:00.
    const start = last.end % MINUTES_PER_DAY
    return {
      ...day,
      intervals: [
        ...day.intervals,
        { start, end: start + NEW_INTERVAL_LENGTH, title: null },
      ],
    }
  })
}

export function setInterval(
  week: Week,
  index: number,
  at: number,
  patch: Partial<Pick<Interval, 'start' | 'end'>>,
): Week {
  return changeDay(week, index, (day) => ({
    ...day,
    intervals: day.intervals.map((interval, i) =>
      i === at ? { ...interval, ...patch } : interval,
    ),
  }))
}

export function removeInterval(week: Week, index: number, at: number): Week {
  return changeDay(week, index, (day) => {
    const intervals = day.intervals.filter((_, i) => i !== at)
    return { working: intervals.length > 0, intervals }
  })
}

// The end stays what the form shows (the clock), so moving the start gives the
// same interval as typing that end after it: night when it falls before.
export function setStart(
  week: Week,
  index: number,
  at: number,
  start: number,
): Week {
  const end = week.days[index].intervals[at].end
  return setInterval(week, index, at, {
    start,
    end: endFromInput(start, endToInput(end)),
  })
}
