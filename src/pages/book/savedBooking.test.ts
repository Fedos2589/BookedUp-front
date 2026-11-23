// @vitest-environment happy-dom
import { afterEach, expect, test, vi } from 'vitest'

import { savedBookingOf, saveBooking, updateSavedBooking } from './savedBooking'

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

const booking = {
  manageLink: 'https://x.test/manage/abc',
  startsAt: '2026-11-24T09:00:00.000Z',
}

test('a saved booking comes back for its business only', () => {
  saveBooking('judo', booking)
  expect(savedBookingOf('judo', new Date('2026-11-23T10:00:00Z'))).toEqual(
    booking,
  )
  expect(savedBookingOf('other', new Date('2026-11-23T10:00:00Z'))).toBeNull()
})

test('a booking that has started is not offered any more', () => {
  saveBooking('judo', booking)
  expect(savedBookingOf('judo', new Date('2026-11-24T09:00:01Z'))).toBeNull()
})

test('garbage in storage is no booking', () => {
  localStorage.setItem('booking:judo', '{"manageLink":5}')
  expect(savedBookingOf('judo', new Date())).toBeNull()
  localStorage.setItem('booking:judo', 'not json')
  expect(savedBookingOf('judo', new Date())).toBeNull()
})

test('storage that throws is no booking and no crash', () => {
  const blocked = () => {
    throw new Error('blocked')
  }
  vi.stubGlobal('localStorage', {
    getItem: blocked,
    setItem: blocked,
    removeItem: blocked,
  })
  expect(() => saveBooking('judo', booking)).not.toThrow()
  expect(() => updateSavedBooking('judo', 'abc', null)).not.toThrow()
  expect(savedBookingOf('judo', new Date())).toBeNull()
})

// Review of #49 — finding 7: the manage page changes the booking it was opened
// for, which is not necessarily the one the browser remembers.
const NOW = new Date('2026-11-23T10:00:00Z')
const LINK = 'https://x.test/book/judo/manage/abc'

test('moving the remembered booking updates its time', () => {
  saveBooking('judo', { manageLink: LINK, startsAt: booking.startsAt })
  updateSavedBooking('judo', 'abc', '2026-11-30T09:00:00.000Z')
  expect(savedBookingOf('judo', NOW)).toEqual({
    manageLink: LINK,
    startsAt: '2026-11-30T09:00:00.000Z',
  })
})

test('cancelling the remembered booking forgets it', () => {
  saveBooking('judo', { manageLink: LINK, startsAt: booking.startsAt })
  updateSavedBooking('judo', 'abc', null)
  expect(savedBookingOf('judo', NOW)).toBeNull()
})

test('another booking of the business leaves the remembered one alone', () => {
  const saved = { manageLink: LINK, startsAt: booking.startsAt }
  saveBooking('judo', saved)
  updateSavedBooking('judo', 'other', null)
  updateSavedBooking('judo', 'other', '2026-11-30T09:00:00.000Z')
  expect(savedBookingOf('judo', NOW)).toEqual(saved)
})
