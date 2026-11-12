import { expect, test } from 'vitest'

import {
  addInterval,
  endFromInput,
  endToInput,
  removeInterval,
  setInterval,
  setWorking,
} from './weekEdit'
import { fromWindows } from './weekModel'

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

test('an end at or before the start is the next day, as the native field has no 24:00', () => {
  expect(endFromInput(540, 1080)).toBe(1080)
  expect(endFromInput(540, 0)).toBe(1440)
  expect(endFromInput(1320, 120)).toBe(1560)
  // Equal is the user's slip, not a 24-hour window: the model reports it.
  expect(endFromInput(540, 540)).toBe(540)
})

test('the field shows the end of a window running into the next day on the clock', () => {
  expect(endToInput(1440)).toBe(0)
  expect(endToInput(1560)).toBe(120)
  expect(endToInput(1080)).toBe(1080)
})

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
