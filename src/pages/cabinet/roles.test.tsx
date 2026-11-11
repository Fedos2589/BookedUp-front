// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { account, fakeApi } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

// A string, not the generated union: the back may add a role before the
// front regenerates its client (review of #6).
const withRole = (role: string) => ({
  ...account,
  businesses: [{ ...account.businesses[0], role }],
})

const noBusiness = { ...account, businesses: [] }

test('an account in no business sees why, and can sign out', async () => {
  const api = fakeApi({
    'GET /api/me': [200, noBusiness],
    'POST /api/auth/sign-out': [204],
  })
  const { router } = renderApp('/')

  expect(
    await screen.findByRole('heading', { name: 'You’re not in a business' }),
  ).toBeTruthy()
  expect(screen.queryByRole('navigation')).toBeNull()

  api.set('GET /api/me', [401])
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))
  await screen.findByRole('heading', { name: 'Sign in' })
  expect(router.state.location.pathname).toBe('/sign-in')
})

test('the settings of no business are the same screen, not an error', async () => {
  fakeApi({ 'GET /api/me': [200, noBusiness] })
  renderApp('/settings')

  expect(
    await screen.findByRole('heading', { name: 'You’re not in a business' }),
  ).toBeTruthy()
})

test('a member removed while the app is open sees the screen on the next /me', async () => {
  const api = fakeApi({ 'GET /api/me': [200, account] })
  const { queryClient } = renderApp('/')
  await screen.findByRole('heading', { name: 'Judo Kids' })

  api.set('GET /api/me', [200, noBusiness])
  await queryClient.refetchQueries()

  expect(
    await screen.findByRole('heading', { name: 'You’re not in a business' }),
  ).toBeTruthy()
})

test('a master has no settings in the navigation', async () => {
  fakeApi({ 'GET /api/me': [200, withRole('MASTER')] })
  renderApp('/')

  await screen.findByRole('heading', { name: 'Judo Kids' })
  expect(screen.getByRole('link', { name: 'Dashboard' })).toBeTruthy()
  expect(screen.queryByRole('link', { name: 'Settings' })).toBeNull()
})

test('a master opening the settings by address lands on the dashboard', async () => {
  fakeApi({ 'GET /api/me': [200, withRole('MASTER')] })
  const { router } = renderApp('/settings')

  await screen.findByRole('heading', { name: 'Judo Kids' })
  await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  expect(
    screen.queryByRole('heading', { name: 'Business settings' }),
  ).toBeNull()
})

test('an admin sees the settings', async () => {
  fakeApi({ 'GET /api/me': [200, withRole('ADMIN')] })
  renderApp('/settings')

  expect(
    await screen.findByRole('heading', { name: 'Business settings' }),
  ).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Settings' })).toBeTruthy()
})

test('a role the front does not know yet sees no settings', async () => {
  fakeApi({ 'GET /api/me': [200, withRole('RECEPTIONIST')] })
  const { router } = renderApp('/settings')

  await screen.findByRole('heading', { name: 'Judo Kids' })
  await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  expect(screen.queryByRole('link', { name: 'Settings' })).toBeNull()
})
