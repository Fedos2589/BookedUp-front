import { expect, test } from 'vitest'

import { calendarSearchOf, shiftDate } from './calendarSearch'

const staffId = '00000000-0000-4000-8000-000000000021'

test('an empty address says nothing', () => {
  expect(calendarSearchOf({})).toEqual({})
})

test('a valid address is kept', () => {
  expect(
    calendarSearchOf({ view: 'week', date: '2026-11-17', staffId }),
  ).toEqual({ view: 'week', date: '2026-11-17', staffId })
})

test('junk falls back to the defaults', () => {
  expect(
    calendarSearchOf({ view: 'month', date: '2026-02-30', staffId: 42 }),
  ).toEqual({})
  expect(calendarSearchOf({ date: 'tomorrow' }).date).toBeUndefined()
})

test('prev and next step a day, or a week, across a month end', () => {
  expect(shiftDate('2026-11-30', 'day', 1)).toBe('2026-12-01')
  expect(shiftDate('2026-12-01', 'day', -1)).toBe('2026-11-30')
  expect(shiftDate('2026-11-30', 'week', 1)).toBe('2026-12-07')
  expect(shiftDate('2026-03-02', 'week', -1)).toBe('2026-02-23')
})
