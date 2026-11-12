import { expect, test } from 'vitest'

import {
  intervalsText,
  newOverrideWeek,
  overrideFromWeek,
  weekOfOverride,
} from './overrideModel'

const win = (
  startMinute: number,
  durationMinutes: number,
  slotMinutes = 30,
) => ({
  startMinute,
  durationMinutes,
  slotMinutes,
})

test('an override round-trips through the one-day form', () => {
  const windows = [win(540, 240), win(840, 180)]
  expect(overrideFromWeek(weekOfOverride(windows))).toEqual(windows)
})

test('a day off is a day without windows, and back', () => {
  const off = weekOfOverride([])
  expect(off.days[0].working).toBe(false)
  expect(overrideFromWeek(off)).toEqual([])
  expect(overrideFromWeek(newOverrideWeek())).toEqual([win(540, 540)])
})

test('intervals are written as clock times, a day without windows as null', () => {
  expect(intervalsText([win(540, 240), win(1320, 180)])).toBe(
    '09:00–13:00, 22:00–01:00',
  )
  expect(intervalsText([win(0, 1440)])).toBe('00:00–00:00')
  expect(intervalsText([])).toBeNull()
})
