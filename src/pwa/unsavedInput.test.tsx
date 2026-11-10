// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react'
import { expect, test } from 'vitest'

import { hasUnsavedInput, useUnsavedInput } from './unsavedInput'

test('a form with typed input holds the update until it is clean or gone', () => {
  const first = renderHook(({ dirty }) => useUnsavedInput(dirty), {
    initialProps: { dirty: false },
  })
  expect(hasUnsavedInput()).toBe(false)

  first.rerender({ dirty: true })
  const second = renderHook(() => useUnsavedInput(true))
  expect(hasUnsavedInput()).toBe(true)

  first.rerender({ dirty: false })
  expect(hasUnsavedInput()).toBe(true)
  second.unmount()
  expect(hasUnsavedInput()).toBe(false)
})
