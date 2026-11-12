import { expect, test } from 'vitest'

import {
  clockOfMinute,
  dateIn,
  dayLabel,
  dateTimeIn,
  endFromInput,
  endToInput,
  timeIn,
  weekdayLabel,
} from './dates'

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

test('dateIn is the calendar day on the business clock, not the browser', () => {
  const moment = new Date('2026-11-12T20:30:00Z')
  expect(dateIn(moment, 'Asia/Bangkok')).toBe('2026-11-13')
  expect(dateIn(moment, 'America/New_York')).toBe('2026-11-12')
})

test('dateIn is undefined for a zone this browser does not know', () => {
  expect(dateIn(new Date(), 'Mars/Olympus')).toBeUndefined()
})

test('a calendar day is worded in the app language without shifting by zone', () => {
  expect(dayLabel('2026-11-13', 'en')).toBe('Fri, Nov 13')
})

test('clockOfMinute: minutes after midnight as HH:MM, the next midnight as 00:00', () => {
  expect(clockOfMinute(0)).toBe('00:00')
  expect(clockOfMinute(15 * 60 + 5)).toBe('15:05')
  expect(clockOfMinute(1440)).toBe('00:00')
  expect(clockOfMinute(1440 + 60)).toBe('01:00')
})

test('weekdayLabel: ISO weekday 1 is Monday, 7 is Sunday', () => {
  expect(weekdayLabel(1, 'en')).toBe('Mon')
  expect(weekdayLabel(7, 'en')).toBe('Sun')
  expect(weekdayLabel(2, 'ru')).toBe('вт')
})

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
