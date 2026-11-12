import { describe, expect, it } from 'vitest'

import { weekSchema } from './weekSchema'
import { fromWindows, type Week, type WindowDto } from './weekModel'

const win = (
  weekday: number,
  startMinute: number,
  durationMinutes: number,
  slotMinutes = 30,
): WindowDto => ({
  weekday,
  startMinute,
  durationMinutes,
  slotMinutes,
  title: null,
})

// What the form shows: where, and which message.
const issuesOf = (week: Week) => {
  const result = weekSchema.safeParse(week)
  return result.success
    ? []
    : result.error.issues.map((i) => ({ path: i.path, message: i.message }))
}

// A week from windows, then a change to it.
const weekOf = (
  windows: WindowDto[],
  change: (week: Week) => void = () => {},
) => {
  const week = fromWindows(windows)
  change(week)
  return week
}

const cases: Record<string, Week> = {
  valid: weekOf([win(1, 540, 240), win(1, 840, 60)]),
  endBeforeStart: weekOf([win(1, 540, 60)], (w) => {
    w.days[0].intervals[0].end = 540
  }),
  touching: weekOf([win(1, 540, 60), win(1, 600, 60)]),
  overlapping: weekOf([win(1, 540, 90), win(1, 600, 60)]),
  ring: weekOf([win(7, 1380, 120), win(1, 30, 60)]),
  emptyWorkingDay: weekOf([], (w) => {
    w.days[2].working = true
  }),
  slotTooLong: weekOf([win(1, 540, 20, 15)], (w) => {
    w.slotMinutes = 30
  }),
  dayOffNotValidated: weekOf([win(1, 540, 60)], (w) => {
    w.days[0].working = false
    w.days[0].intervals[0].end = 0
  }),
}

describe('weekSchema', () => {
  it('accepts a valid week and touching intervals', () => {
    expect(issuesOf(cases.valid)).toEqual([])
    expect(issuesOf(cases.touching)).toEqual([])
  })

  it('puts an end-before-start on the interval', () => {
    expect(issuesOf(cases.endBeforeStart)).toEqual([
      {
        path: ['days', 0, 'intervals', 0],
        message: 'validation.endBeforeStart',
      },
    ])
  })

  it('puts an overlap on the later interval, Sunday night into Monday included', () => {
    expect(issuesOf(cases.overlapping)).toEqual([
      { path: ['days', 0, 'intervals', 1], message: 'validation.overlap' },
    ])
    expect(issuesOf(cases.ring)).toEqual([
      { path: ['days', 6, 'intervals', 0], message: 'validation.overlap' },
    ])
  })

  it('puts a working day without intervals on the day', () => {
    expect(issuesOf(cases.emptyWorkingDay)).toEqual([
      { path: ['days', 2], message: 'validation.emptyDay' },
    ])
  })

  it('puts a step longer than an interval on the interval', () => {
    expect(issuesOf(cases.slotTooLong)).toEqual([
      { path: ['days', 0, 'intervals', 0], message: 'validation.slotTooLong' },
    ])
  })

  it('does not validate a day off', () => {
    expect(issuesOf(cases.dayOffNotValidated)).toEqual([])
  })
})
