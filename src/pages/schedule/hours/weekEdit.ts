import { endFromInput, endToInput } from '@/dates'
import {
  DEFAULT_INTERVAL,
  nextInterval,
  type Day,
  type Interval,
  type Week,
} from './weekModel'

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
    return { ...day, intervals: [...day.intervals, nextInterval(last)] }
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
