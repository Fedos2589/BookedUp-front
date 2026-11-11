import { expect, test } from 'vitest'

import { timeIn } from './dates'

test('the wall-clock time in a time zone, not the browser’s', () => {
  const now = new Date('2026-11-11T03:40:00Z')

  expect(timeIn(now, 'Asia/Bangkok')).toBe('10:40')
  expect(timeIn(now, 'Europe/Moscow')).toBe('06:40')
  expect(timeIn(now, 'America/New_York')).toBe('22:40')
})

test('follows daylight saving time', () => {
  expect(timeIn(new Date('2026-07-01T12:00:00Z'), 'Europe/Berlin')).toBe(
    '14:00',
  )
  expect(timeIn(new Date('2026-01-01T12:00:00Z'), 'Europe/Berlin')).toBe(
    '13:00',
  )
})
