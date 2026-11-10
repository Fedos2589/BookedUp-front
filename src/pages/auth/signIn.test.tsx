// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { getMeControllerMeQueryKey } from '../../api/account/account'
import { account, fakeApi } from '../../test/fakeApi'
import { renderApp } from '../../test/renderApp'

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
