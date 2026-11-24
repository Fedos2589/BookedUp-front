// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { account, fakeApi } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const push = vi.hoisted(() => ({
  pushSupport: vi.fn(() => 'yes'),
  subscribe: vi.fn(),
  currentEndpoint: vi.fn(),
  unsubscribe: vi.fn(),
  PushDeniedError: class PushDeniedError extends Error {},
  PushDismissedError: class PushDismissedError extends Error {},
}))
vi.mock('@/pwa/push', () => push)

const PUSH_OFF = 'DELETE /api/me/notifications/push'
const SIGN_OUT = 'POST /api/auth/sign-out'

beforeEach(() => {
  push.currentEndpoint.mockResolvedValue('https://push/me')
})

async function signOut() {
  const { router } = renderApp('/')
  await screen.findByRole('heading', { name: 'Judo Kids' })
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
  return router
}

test('signing out first turns this device’s push off, then ends the session', async () => {
  const api = fakeApi({
    'GET /api/me': [200, account],
    [PUSH_OFF]: [204],
    [SIGN_OUT]: [204],
  })
  const router = await signOut()

  await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'))
  const routes = api.calls.map((c) => c.route)
  expect(routes.indexOf(PUSH_OFF)).toBeGreaterThan(-1)
  expect(routes.indexOf(PUSH_OFF)).toBeLessThan(routes.indexOf(SIGN_OUT))
  expect(api.calls.find((c) => c.route === PUSH_OFF)?.body).toEqual({
    endpoint: 'https://push/me',
  })
})

test('a browser with no subscription sends no DELETE', async () => {
  push.currentEndpoint.mockResolvedValue(null)
  const api = fakeApi({ 'GET /api/me': [200, account], [SIGN_OUT]: [204] })
  const router = await signOut()

  await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'))
  expect(api.calls.some((c) => c.route === PUSH_OFF)).toBe(false)
})

test('a failed DELETE does not stop signing out', async () => {
  fakeApi({
    'GET /api/me': [200, account],
    [PUSH_OFF]: [500],
    [SIGN_OUT]: [204],
  })
  const router = await signOut()

  await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'))
})

test('a browser that cannot read its subscription still signs out', async () => {
  push.currentEndpoint.mockRejectedValue(new Error('no service worker'))
  fakeApi({ 'GET /api/me': [200, account], [SIGN_OUT]: [204] })
  const router = await signOut()

  await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'))
})

test('a second click while the push is turned off signs out once', async () => {
  let release: () => void = () => {}
  const held = new Promise<void>((resolve) => (release = resolve))
  const api = fakeApi({
    'GET /api/me': [200, account],
    [PUSH_OFF]: async () => {
      await held
      return [204]
    },
    [SIGN_OUT]: [204],
  })
  renderApp('/')
  await screen.findByRole('heading', { name: 'Judo Kids' })
  const button = screen.getByRole('button', { name: 'Sign out' })
  fireEvent.click(button)
  fireEvent.click(button)
  release()

  await waitFor(() =>
    expect(api.calls.filter((c) => c.route === SIGN_OUT)).toHaveLength(1),
  )
  expect(api.calls.filter((c) => c.route === PUSH_OFF)).toHaveLength(1)
})

test('signing out from the invitation page also turns the push off', async () => {
  const api = fakeApi({
    'GET /api/me': [200, account],
    'GET /api/invitations/tok': [
      200,
      { businessName: 'Judo Kids', email: 'new@example.com', role: 'MASTER' },
    ],
    [PUSH_OFF]: [204],
    [SIGN_OUT]: [204],
  })
  renderApp('/invite/tok')
  fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }))

  await waitFor(() =>
    expect(api.calls.some((c) => c.route === SIGN_OUT)).toBe(true),
  )
  const routes = api.calls.map((c) => c.route)
  expect(routes.indexOf(PUSH_OFF)).toBeLessThan(routes.indexOf(SIGN_OUT))
})
