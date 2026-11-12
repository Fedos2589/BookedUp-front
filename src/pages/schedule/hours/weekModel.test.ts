import { expect, test } from 'vitest'

import {
  fromWindows,
  nextInterval,
  toWindows,
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

test('a new interval starts where the last one ends, two hours long', () => {
  expect(nextInterval({ start: 600, end: 720, title: null })).toEqual({
    start: 720,
    end: 840,
    title: null,
  })
})

test('a new interval after one ending at midnight starts on the clock, not at 24:00', () => {
  expect(nextInterval({ start: 1320, end: 1440, title: null })).toEqual({
    start: 0,
    end: 120,
    title: null,
  })
})

test('the first interval of a day is the usual 09:00–18:00', () => {
  expect(nextInterval(undefined)).toEqual({
    start: 540,
    end: 1080,
    title: null,
  })
})
