// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { useNow } from './useNow'

afterEach(() => vi.useRealTimers())

test('moves on with the clock while shown', () => {
  vi.useFakeTimers({ now: new Date('2026-11-11T03:40:00Z') })
  const { result } = renderHook(() => useNow())
  expect(result.current.toISOString()).toBe('2026-11-11T03:40:00.000Z')

  act(() => {
    vi.advanceTimersByTime(30_000)
  })

  expect(result.current.toISOString()).toBe('2026-11-11T03:40:30.000Z')
})
