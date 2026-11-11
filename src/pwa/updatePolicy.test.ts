import { expect, test, vi } from 'vitest'

import { createUpdatePolicy } from './updatePolicy'

function setup(unsaved = false) {
  const deps = {
    checkForUpdate: vi.fn(),
    applyUpdate: vi.fn(),
    hasUnsavedInput: vi.fn(() => unsaved),
  }
  return { deps, policy: createUpdatePolicy(deps) }
}

test('coming back to the screen checks for a new version', () => {
  const { deps, policy } = setup()

  policy.visibilityChanged('visible')

  expect(deps.checkForUpdate).toHaveBeenCalledOnce()
  expect(deps.applyUpdate).not.toHaveBeenCalled()
})

test('going to the background with no new version does nothing', () => {
  const { deps, policy } = setup()

  policy.visibilityChanged('hidden')

  expect(deps.applyUpdate).not.toHaveBeenCalled()
})

test('a new version is applied when the app goes to the background', () => {
  const { deps, policy } = setup()

  policy.updateReady()
  expect(deps.applyUpdate).not.toHaveBeenCalled()
  policy.visibilityChanged('hidden')

  expect(deps.applyUpdate).toHaveBeenCalledOnce()
})

test('not while a form holds typed input: then at a later background', () => {
  const { deps, policy } = setup(true)

  policy.updateReady()
  policy.visibilityChanged('hidden')
  expect(deps.applyUpdate).not.toHaveBeenCalled()

  deps.hasUnsavedInput.mockReturnValue(false)
  policy.visibilityChanged('visible')
  policy.visibilityChanged('hidden')
  expect(deps.applyUpdate).toHaveBeenCalledOnce()
})
