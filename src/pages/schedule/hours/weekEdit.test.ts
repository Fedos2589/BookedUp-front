import { expect, test } from 'vitest'

import {
  addInterval,
  removeInterval,
  setInterval,
  setStart,
  setWorking,
} from './weekEdit'
import { fromWindows, validateWeek } from './weekModel'

const week = () =>
  fromWindows([
    {
      weekday: 2,
      startMinute: 600,
      durationMinutes: 120,
      slotMinutes: 30,
      title: null,
    },
  ])

test('turning a day on gives it a working interval, turning it off keeps the intervals', () => {
  const on = setWorking(week(), 0, true)
  expect(on.days[0]).toEqual({
    working: true,
    intervals: [{ start: 540, end: 1080, title: null }],
  })
  const off = setWorking(on, 0, false)
  expect(off.days[0].working).toBe(false)
  expect(setWorking(off, 0, true).days[0].intervals).toHaveLength(1)
})

test('a new interval starts where the last one ends', () => {
  const next = addInterval(week(), 1)
  expect(next.days[1].intervals).toEqual([
    { start: 600, end: 720, title: null },
    { start: 720, end: 840, title: null },
  ])
})

test('an interval is changed in place, other days are untouched', () => {
  const w = week()
  const next = setInterval(w, 1, 0, { start: 480 })
  expect(next.days[1].intervals[0]).toEqual({
    start: 480,
    end: 720,
    title: null,
  })
  expect(next.days[0]).toBe(w.days[0])
})

test('removing the last interval makes the day a day off', () => {
  const two = addInterval(week(), 1)
  expect(removeInterval(two, 1, 1).days[1].intervals).toHaveLength(1)
  const none = removeInterval(week(), 1, 0)
  expect(none.days[1].working).toBe(false)
})

test('changing the start keeps the end on the clock: a night interval stays one', () => {
  const night = fromWindows([
    {
      weekday: 5,
      startMinute: 1320,
      durationMinutes: 180,
      slotMinutes: 30,
      title: null,
    },
  ])
  // 22:00–01:00, start to 00:30: 00:30–01:00, not a 25-hour window.
  const moved = setStart(night, 4, 0, 30)
  expect(moved.days[4].intervals[0]).toEqual({
    start: 30,
    end: 60,
    title: null,
  })
  expect(validateWeek(moved)).toEqual([])
})

test('a start after the typed end turns the interval into a night one, as the end field does', () => {
  const day = fromWindows([
    {
      weekday: 1,
      startMinute: 540,
      durationMinutes: 540,
      slotMinutes: 30,
      title: null,
    },
  ])
  const moved = setStart(day, 0, 0, 1140)
  expect(moved.days[0].intervals[0]).toEqual({
    start: 1140,
    end: 1080 + 1440,
    title: null,
  })
  expect(validateWeek(moved)).toEqual([])
})

test('a new interval after one ending at midnight starts on the clock, not at 24:00', () => {
  const week = fromWindows([
    {
      weekday: 4,
      startMinute: 1080,
      durationMinutes: 360,
      slotMinutes: 30,
      title: null,
    },
  ])
  const next = addInterval(week, 3)
  expect(next.days[3].intervals[1].start).toBe(0)
})
