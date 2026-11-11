// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { account, fakeApi } from '../../test/fakeApi'
import { renderApp } from '../../test/renderApp'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const [business] = account.businesses
const businessRoute = `GET /api/businesses/${business.id}`

test('the settings show the business, its booking page and its time zone', async () => {
  const api = fakeApi({
    'GET /api/me': [200, account],
    [businessRoute]: [200, business],
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
  expect(api.calls.map((call) => call.route)).toContain(businessRoute)
})

test('the cabinet links to the settings and back', async () => {
  fakeApi({
    'GET /api/me': [200, account],
    [businessRoute]: [200, business],
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

test('when the business cannot be loaded, the settings offer to try again', async () => {
  const api = fakeApi({
    'GET /api/me': [200, account],
    [businessRoute]: [502],
  })
  renderApp('/settings')

  const retry = await screen.findByRole('button', { name: 'Try again' })
  api.set(businessRoute, [200, business])
  fireEvent.click(retry)

  expect(
    await screen.findByRole('heading', { name: 'Business settings' }),
  ).toBeTruthy()
})
