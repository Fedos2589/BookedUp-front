// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { account, fakeApi } from '../../test/fakeApi'
import { renderApp } from '../../test/renderApp'
import { browserTimeZone } from './timeZones'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const field = (label: string) =>
  screen.getByLabelText(label) as HTMLInputElement

function fill(label: string, value: string) {
  fireEvent.change(field(label), { target: { value } })
}

const click = (name: string) =>
  fireEvent.click(screen.getByRole('button', { name }))

const signUpAnswer = {
  user: account.user,
  business: {
    id: account.businesses[0].id,
    name: 'Judo Kids',
    slug: 'judo-kids',
    timeZone: browserTimeZone(),
  },
}

async function passAccountStep() {
  await screen.findByRole('heading', { name: 'Create your account' })
  fill('Your name', 'Anna')
  fill('Email', 'anna@example.com')
  fill('Password', 'long enough')
  click('Continue')
  await screen.findByRole('heading', { name: 'Your business' })
}

test('an owner signs up in two steps and lands in the cabinet', async () => {
  const api = fakeApi({ 'GET /api/me': [401] })
  api.set('POST /api/auth/sign-up', [201, signUpAnswer])
  const { router } = renderApp('/sign-up')

  await passAccountStep()
  fill('Business name', 'Judo Kids')
  expect(field('Booking page address').value).toBe('judo-kids')
  expect(field('Time zone').value).toBe(browserTimeZone())
  api.set('GET /api/me', [200, account])
  click('Create account')

  expect(await screen.findByRole('heading', { name: 'Judo Kids' })).toBeTruthy()
  expect(router.state.location.pathname).toBe('/')
  expect(api.calls).toContainEqual({
    route: 'POST /api/auth/sign-up',
    body: {
      name: 'Anna',
      email: 'anna@example.com',
      password: 'long enough',
      business: {
        name: 'Judo Kids',
        slug: 'judo-kids',
        timeZone: browserTimeZone(),
      },
    },
  })
})

test('an address typed by hand is not replaced when the name changes', async () => {
  fakeApi({ 'GET /api/me': [401] })
  renderApp('/sign-up')
  await passAccountStep()

  fill('Business name', 'Judo Kids')
  fill('Booking page address', 'judo-phuket')
  fill('Business name', 'Judo Kids Phuket')

  expect(field('Booking page address').value).toBe('judo-phuket')
})

test('a short password keeps the owner on the first step', async () => {
  fakeApi({ 'GET /api/me': [401] })
  renderApp('/sign-up')
  await screen.findByRole('heading', { name: 'Create your account' })

  fill('Your name', 'Anna')
  fill('Email', 'anna@example.com')
  fill('Password', 'short')
  click('Continue')

  expect(await screen.findByText('At least 8 characters')).toBeTruthy()
  expect(
    screen.getByRole('heading', { name: 'Create your account' }),
  ).toBeTruthy()
})

test('going back keeps what was typed', async () => {
  fakeApi({ 'GET /api/me': [401] })
  renderApp('/sign-up')
  await passAccountStep()

  click('Back')

  await screen.findByRole('heading', { name: 'Create your account' })
  expect(field('Your name').value).toBe('Anna')
  expect(field('Email').value).toBe('anna@example.com')
})

test('a registered email sends the owner back to it', async () => {
  fakeApi({
    'GET /api/me': [401],
    'POST /api/auth/sign-up': [
      409,
      {
        statusCode: 409,
        error: 'Conflict',
        message: 'Email is taken',
        field: 'email',
      },
    ],
  })
  renderApp('/sign-up')
  await passAccountStep()
  fill('Business name', 'Judo Kids')

  click('Create account')

  expect(
    await screen.findByText('This email is already registered'),
  ).toBeTruthy()
  expect(
    screen.getByRole('heading', { name: 'Create your account' }),
  ).toBeTruthy()
  expect(field('Email').value).toBe('anna@example.com')
})

test('a taken address is marked on the business step', async () => {
  fakeApi({
    'GET /api/me': [401],
    'POST /api/auth/sign-up': [
      409,
      {
        statusCode: 409,
        error: 'Conflict',
        message: 'Slug is taken',
        field: 'slug',
      },
    ],
  })
  renderApp('/sign-up')
  await passAccountStep()
  fill('Business name', 'Judo Kids')

  click('Create account')

  expect(await screen.findByText('This address is taken')).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'Your business' })).toBeTruthy()
})

test('signed up but without a session: the owner is sent to sign in', async () => {
  fakeApi({
    'GET /api/me': [401],
    'POST /api/auth/sign-up': [201, signUpAnswer],
  })
  const { router } = renderApp('/sign-up')
  await passAccountStep()
  fill('Business name', 'Judo Kids')

  click('Create account')

  await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'))
})
