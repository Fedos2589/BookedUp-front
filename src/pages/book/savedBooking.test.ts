// @vitest-environment happy-dom
import { afterEach, expect, test, vi } from 'vitest'

import { forgetSavedBooking, savedBookingOf, saveBooking } from './savedBooking'

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

test('forgetting removes it', () => {
  saveBooking('judo', booking)
  forgetSavedBooking('judo')
  expect(savedBookingOf('judo', new Date('2026-11-23T10:00:00Z'))).toBeNull()
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
  expect(() => forgetSavedBooking('judo')).not.toThrow()
  expect(savedBookingOf('judo', new Date())).toBeNull()
})
