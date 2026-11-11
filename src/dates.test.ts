import { expect, test } from 'vitest'

import { dateTimeIn, timeIn } from './dates'

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

// The back canonicalises zones with Node's ICU; an older browser's ICU may not
// know a newer name, and Intl throws RangeError (review of #4).
test('a zone the browser does not know gives no time instead of throwing', () => {
  expect(timeIn(new Date('2026-11-11T03:40:00Z'), 'Mars/Olympus_Mons')).toBe(
    undefined,
  )
})

test('a date and time in the business zone, in the app’s language', () => {
  const moment = new Date('2026-11-18T20:30:00Z')

  // Already the 19th in Bangkok.
  expect(dateTimeIn(moment, 'Asia/Bangkok', 'en')).toBe('Nov 19, 03:30')
  expect(dateTimeIn(moment, 'Asia/Bangkok', 'ru')).toBe('19 нояб., 03:30')
  expect(dateTimeIn(moment, 'Mars/Olympus_Mons', 'en')).toBe(undefined)
})
