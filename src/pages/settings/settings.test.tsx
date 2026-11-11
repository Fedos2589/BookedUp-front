// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { account, fakeApi } from '../../test/fakeApi'
import { renderApp } from '../../test/renderApp'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

test('the settings show the business, its booking page and its time zone', async () => {
  const api = fakeApi({
    'GET /api/me': [200, account],
  })
  renderApp('/settings')

  expect(
    await screen.findByRole('heading', { name: 'Business settings' }),
  ).toBeTruthy()
  expect(screen.getByText('Judo Kids')).toBeTruthy()
  const bookingPage = screen.getByRole('link', {
    name: `${window.location.host}/book/judo-kids`,
  })
  expect(bookingPage.getAttribute('href')).toBe('/book/judo-kids')
  expect(screen.getByText('Asia/Bangkok')).toBeTruthy()
  expect(screen.getByText(/^It’s \d\d:\d\d there now$/)).toBeTruthy()
  // Everything shown comes with GET /me (review of #4): no other request.
  await waitFor(() =>
    expect(new Set(api.calls.map((call) => call.route))).toEqual(
      new Set(['GET /api/me']),
    ),
  )
})

test('the cabinet links to the settings and back', async () => {
  fakeApi({
    'GET /api/me': [200, account],
  })
  const { router } = renderApp('/')
  await screen.findByRole('heading', { name: 'Judo Kids' })

  fireEvent.click(screen.getByRole('link', { name: 'Settings' }))
  await screen.findByRole('heading', { name: 'Business settings' })
  expect(router.state.location.pathname).toBe('/settings')

  fireEvent.click(screen.getByRole('link', { name: 'Dashboard' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/'))
})

test('a guest opening the settings is sent to sign in', async () => {
  fakeApi({ 'GET /api/me': [401] })
  const { router } = renderApp('/settings')

  await screen.findByRole('heading', { name: 'Sign in' })
  expect(router.state.location.pathname).toBe('/sign-in')
})

test('when the session check fails, the settings offer to try again', async () => {
  const api = fakeApi({ 'GET /api/me': [502] })
  renderApp('/settings')

  expect(
    await screen.findByRole('heading', { name: "Couldn't load your account" }),
  ).toBeTruthy()
  api.set('GET /api/me', [200, account])
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

  expect(
    await screen.findByRole('heading', { name: 'Business settings' }),
  ).toBeTruthy()
})

test('a time zone this browser does not know still shows, without a time', async () => {
  const unknownZone = 'Mars/Olympus_Mons'
  fakeApi({
    'GET /api/me': [
      200,
      {
        ...account,
        businesses: [{ ...account.businesses[0], timeZone: unknownZone }],
      },
    ],
  })
  renderApp('/settings')

  expect(await screen.findByText(unknownZone)).toBeTruthy()
  expect(screen.getByText('Judo Kids')).toBeTruthy()
  expect(screen.queryByText(/there now$/)).toBeNull()
})
