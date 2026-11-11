// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { getMeControllerMeQueryKey } from '@/api/account/account'
import { hasUnsavedInput } from '@/pwa/unsavedInput'
import { account, fakeApi } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

test('a guest opening the dashboard is sent to sign in', async () => {
  fakeApi({ 'GET /api/me': [401] })
  const { router } = renderApp('/')

  expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeTruthy()
  expect(router.state.location.pathname).toBe('/sign-in')
})

test('signing in opens the dashboard of the business', async () => {
  const api = fakeApi({
    'GET /api/me': [401],
    'POST /api/auth/sign-in': [200, account],
  })
  const { router } = renderApp('/sign-in')
  await screen.findByRole('heading', { name: 'Sign in' })

  fill('Email', 'anna@example.com')
  fill('Password', 'correct horse')
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

  expect(await screen.findByRole('heading', { name: 'Judo Kids' })).toBeTruthy()
  expect(router.state.location.pathname).toBe('/')
  expect(api.calls).toContainEqual({
    route: 'POST /api/auth/sign-in',
    body: { email: 'anna@example.com', password: 'correct horse' },
  })
})

test('a wrong password is reported and the form stays', async () => {
  fakeApi({ 'GET /api/me': [401], 'POST /api/auth/sign-in': [401] })
  const { router } = renderApp('/sign-in')
  await screen.findByRole('heading', { name: 'Sign in' })

  fill('Email', 'anna@example.com')
  fill('Password', 'wrong')
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

  expect(await screen.findByText('Invalid email or password')).toBeTruthy()
  expect(router.state.location.pathname).toBe('/sign-in')
})

test('an invalid email is caught before any request', async () => {
  const api = fakeApi({ 'GET /api/me': [401] })
  renderApp('/sign-in')
  await screen.findByRole('heading', { name: 'Sign in' })

  fill('Email', 'anna')
  fill('Password', 'whatever')
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

  expect(await screen.findByText('Enter a valid email')).toBeTruthy()
  expect(api.calls.map((c) => c.route)).not.toContain('POST /api/auth/sign-in')
})

test('a signed-in owner opening sign in lands on the dashboard', async () => {
  fakeApi({ 'GET /api/me': [200, account] })
  const { router } = renderApp('/sign-in')

  expect(await screen.findByRole('heading', { name: 'Judo Kids' })).toBeTruthy()
  expect(router.state.location.pathname).toBe('/')
})

test('signing out returns to sign in and forgets the account', async () => {
  const api = fakeApi({
    'GET /api/me': [200, account],
    'POST /api/auth/sign-out': [204],
  })
  const { router, queryClient } = renderApp('/')
  await screen.findByRole('heading', { name: 'Judo Kids' })
  api.set('GET /api/me', [401])

  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))

  // With the account still cached, sign in would bounce back to the dashboard.
  await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'))
  expect(queryClient.getQueryData(getMeControllerMeQueryKey())).toBeUndefined()
})

test('when the session check fails, the cabinet offers to try again', async () => {
  const api = fakeApi({ 'GET /api/me': [502] })
  renderApp('/')

  const retry = await screen.findByRole('button', { name: 'Try again' })
  api.set('GET /api/me', [200, account])
  fireEvent.click(retry)

  expect(await screen.findByRole('heading', { name: 'Judo Kids' })).toBeTruthy()
})

// Review #1: every retry of the session check is seconds of blank page.
test('with the back down, the session check asks at most twice', async () => {
  const api = fakeApi({ 'GET /api/me': [502] })
  renderApp('/sign-in')

  await screen.findByRole('heading', { name: 'Sign in' })
  expect(api.calls.filter((c) => c.route === 'GET /api/me').length).toBe(2)
})

// A 401 is an answer: no retry, so a guest waits for no backoff (once on `/`,
// once more on /sign-in, whose check finds no account cached).
test('a guest is redirected after one session check per page', async () => {
  const api = fakeApi({ 'GET /api/me': [401] })
  renderApp('/')

  await screen.findByRole('heading', { name: 'Sign in' })
  expect(api.calls.filter((c) => c.route === 'GET /api/me').length).toBe(2)
})

// Review #2: a session ended elsewhere (another tab, expiry).
test('a session that ended elsewhere sends the cabinet to sign in on its next check', async () => {
  const api = fakeApi({ 'GET /api/me': [200, account] })
  const { router, queryClient } = renderApp('/')
  await screen.findByRole('heading', { name: 'Judo Kids' })
  api.set('GET /api/me', [401])

  await queryClient.invalidateQueries()

  await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'))
  expect(queryClient.getQueryData(getMeControllerMeQueryKey())).toBeUndefined()
})

test('a cached account older than 30 s is checked again before bouncing from sign in', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  try {
    const api = fakeApi({ 'GET /api/me': [200, account] })
    const { router } = renderApp('/')
    await screen.findByRole('heading', { name: 'Judo Kids' })
    api.set('GET /api/me', [401])
    vi.setSystemTime(Date.now() + 31_000)

    await router.navigate({ to: '/sign-in' })

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeTruthy()
    expect(router.state.location.pathname).toBe('/sign-in')
  } finally {
    vi.useRealTimers()
  }
})

// Review #3.
test('a failed sign out is reported and the owner stays', async () => {
  fakeApi({
    'GET /api/me': [200, account],
    'POST /api/auth/sign-out': [503],
  })
  const { router } = renderApp('/')
  await screen.findByRole('heading', { name: 'Judo Kids' })

  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }))

  expect(
    await screen.findByText('Something went wrong. Try again.'),
  ).toBeTruthy()
  expect(router.state.location.pathname).toBe('/')
})

// A new app version reloads the page: typed input holds it back (src/pwa).
test('typed input holds back an app update until the form is gone', async () => {
  fakeApi({
    'GET /api/me': [401],
    'POST /api/auth/sign-in': [200, account],
  })
  renderApp('/sign-in')
  await screen.findByRole('heading', { name: 'Sign in' })
  expect(hasUnsavedInput()).toBe(false)

  fill('Email', 'anna@example.com')
  expect(hasUnsavedInput()).toBe(true)

  fill('Password', 'correct horse')
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
  await screen.findByRole('heading', { name: 'Judo Kids' })
  expect(hasUnsavedInput()).toBe(false)
})
