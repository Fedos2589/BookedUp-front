// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { useNow } from './useNow'

afterEach(() => vi.useRealTimers())

const minutesOf = (date: Date) => date.toISOString().slice(11, 16)

test('turns over with the minute, not 30 s later', () => {
  vi.useFakeTimers({ now: new Date('2026-11-11T03:40:59Z') })
  const { result } = renderHook(() => useNow())
  expect(minutesOf(result.current)).toBe('03:40')

  act(() => {
    vi.advanceTimersByTime(1_000)
  })
  expect(minutesOf(result.current)).toBe('03:41')

  act(() => {
    vi.advanceTimersByTime(60_000)
  })
  expect(minutesOf(result.current)).toBe('03:42')
})

// iOS and Android freeze an installed app's timers in the background.
test('is current again the moment the app comes back to the screen', () => {
  vi.useFakeTimers({ now: new Date('2026-11-11T03:40:10Z') })
  const { result } = renderHook(() => useNow())

  // An hour in the background, timers frozen: only the clock moved.
  vi.setSystemTime(new Date('2026-11-11T04:40:10Z'))
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'))
  })

  expect(minutesOf(result.current)).toBe('04:40')
})
