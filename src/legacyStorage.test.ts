// @vitest-environment happy-dom
import { afterEach, expect, test, vi } from 'vitest'

import { forgetSavedBookings } from './legacyStorage'

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

test('forgets the saved bookings of every business and nothing else', () => {
  localStorage.setItem('booking:judo', '{"manageLink":"x"}')
  localStorage.setItem('booking:yoga', '{}')
  localStorage.setItem('i18nextLng', 'ru')

  forgetSavedBookings()

  expect(localStorage.getItem('booking:judo')).toBeNull()
  expect(localStorage.getItem('booking:yoga')).toBeNull()
  expect(localStorage.getItem('i18nextLng')).toBe('ru')
})

test('blocked storage is not an error', () => {
  vi.stubGlobal(
    'localStorage',
    new Proxy(
      {},
      {
        ownKeys() {
          throw new Error('blocked')
        },
      },
    ),
  )
  expect(() => forgetSavedBookings()).not.toThrow()
})
