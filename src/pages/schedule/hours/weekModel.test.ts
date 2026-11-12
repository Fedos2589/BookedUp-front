import { expect, test } from 'vitest'

import {
  fromWindows,
  toWindows,
  validateWeek,
  type Week,
  type WindowDto,
} from './weekModel'

const win = (
  weekday: number,
  startMinute: number,
  durationMinutes: number,
  slotMinutes = 30,
  title: string | null = null,
): WindowDto => ({ weekday, startMinute, durationMinutes, slotMinutes, title })

const emptyWeek = (): Week => fromWindows([])

test('windows survive a trip through the form and back', () => {
  const windows = [
    win(1, 540, 240, 30, 'Haircuts'),
    win(1, 840, 180, 30),
    win(5, 600, 120, 30),
  ]
  expect(toWindows(fromWindows(windows))).toEqual(windows)
})

test('a day with windows is working, one without is a day off', () => {
  const week = fromWindows([win(2, 540, 60)])
  expect(week.days.map((d) => d.working)).toEqual([
    false,
    true,
    false,
    false,
    false,
    false,
    false,
  ])
  expect(week.days[1].intervals).toEqual([
    { start: 540, end: 600, title: null },
  ])
})

test('intervals of a day are ordered by start', () => {
  const week = fromWindows([win(1, 840, 60), win(1, 540, 60)])
  expect(week.days[0].intervals.map((i) => i.start)).toEqual([540, 840])
})

test('one slot step for the whole week: the most common, smaller on a tie', () => {
  expect(
    fromWindows([win(1, 0, 60, 15), win(2, 0, 60, 30), win(3, 0, 60, 30)])
      .slotMinutes,
  ).toBe(30)
  expect(fromWindows([win(1, 0, 60, 30), win(2, 0, 60, 15)]).slotMinutes).toBe(
    15,
  )
})

test('an empty week has the default step', () => {
  expect(emptyWeek().slotMinutes).toBe(30)
})

test('the step is written into every window', () => {
  const week = fromWindows([win(1, 0, 60, 15), win(2, 0, 60, 30)])
  week.slotMinutes = 20
  expect(toWindows(week).map((w) => w.slotMinutes)).toEqual([20, 20])
})

test('intervals of a day off are not sent', () => {
  const week = fromWindows([win(1, 540, 60)])
  week.days[0].working = false
  expect(toWindows(week)).toEqual([])
})

test('a valid week has no errors', () => {
  expect(
    validateWeek(fromWindows([win(1, 540, 240), win(1, 840, 60)])),
  ).toEqual([])
})

test('an interval must end after it starts', () => {
  const week = fromWindows([win(1, 540, 60)])
  week.days[0].intervals[0].end = 540
  expect(validateWeek(week)).toEqual([
    { weekday: 1, index: 0, code: 'endBeforeStart' },
  ])
})

test('intervals of a day may not overlap, touching is fine', () => {
  const touching = fromWindows([win(1, 540, 60), win(1, 600, 60)])
  expect(validateWeek(touching)).toEqual([])
  const overlapping = fromWindows([win(1, 540, 90), win(1, 600, 60)])
  expect(validateWeek(overlapping)).toEqual([
    { weekday: 1, index: 1, code: 'overlap' },
  ])
})

test('Sunday night running into Monday overlaps (the week is a ring)', () => {
  const week = fromWindows([win(7, 1380, 120), win(1, 30, 60)])
  expect(validateWeek(week)).toEqual([
    { weekday: 7, index: 0, code: 'overlap' },
  ])
})

test('a working day needs an interval', () => {
  const week = emptyWeek()
  week.days[2].working = true
  expect(validateWeek(week)).toEqual([{ weekday: 3, code: 'empty' }])
})

test('the step may not be longer than an interval', () => {
  const week = fromWindows([win(1, 540, 20, 15)])
  week.slotMinutes = 30
  expect(validateWeek(week)).toEqual([
    { weekday: 1, index: 0, code: 'slotTooLong' },
  ])
})

test('a day off is not validated', () => {
  const week = fromWindows([win(1, 540, 60)])
  week.days[0].working = false
  week.days[0].intervals[0].end = 0
  expect(validateWeek(week)).toEqual([])
})
