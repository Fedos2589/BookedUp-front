// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { account, fakeApi } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'
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

// Review #4: Enter / the keyboard's "Go" submits the step (implicit submission
// needs a submit button in the form).
test('the first step is submitted like a form', async () => {
  fakeApi({ 'GET /api/me': [401] })
  renderApp('/sign-up')
  await screen.findByRole('heading', { name: 'Create your account' })
  fill('Your name', 'Anna')
  fill('Email', 'anna@example.com')
  fill('Password', 'long enough')

  expect(
    screen.getByRole('button', { name: 'Continue' }).getAttribute('type'),
  ).toBe('submit')
  fireEvent.submit(field('Password').form!)

  expect(
    await screen.findByRole('heading', { name: 'Your business' }),
  ).toBeTruthy()
})

// Review #5: focus follows the flow.
test('the next step’s heading gets the focus', async () => {
  fakeApi({ 'GET /api/me': [401] })
  renderApp('/sign-up')
  await passAccountStep()

  await waitFor(() =>
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: 'Your business' }),
    ),
  )
})

test('an invalid first step focuses its first invalid field', async () => {
  fakeApi({ 'GET /api/me': [401] })
  renderApp('/sign-up')
  await screen.findByRole('heading', { name: 'Create your account' })
  fill('Your name', 'Anna')
  fill('Email', 'anna@example.com')
  fill('Password', 'short')

  click('Continue')

  await waitFor(() => expect(document.activeElement).toBe(field('Password')))
})

test('a registered email focuses the email field', async () => {
  fakeApi({
    'GET /api/me': [401],
    'POST /api/auth/sign-up': [
      409,
      { statusCode: 409, error: 'Conflict', message: 'taken', field: 'email' },
    ],
  })
  renderApp('/sign-up')
  await passAccountStep()
  fill('Business name', 'Judo Kids')

  click('Create account')

  await waitFor(() => expect(document.activeElement).toBe(field('Email')))
})

// Review #6.
test('a taken address stops being reported once the name changes it', async () => {
  fakeApi({
    'GET /api/me': [401],
    'POST /api/auth/sign-up': [
      409,
      { statusCode: 409, error: 'Conflict', message: 'taken', field: 'slug' },
    ],
  })
  renderApp('/sign-up')
  await passAccountStep()
  fill('Business name', 'Judo Kids')
  click('Create account')
  await screen.findByText('This address is taken')

  fill('Business name', 'Judo Kids Phuket')

  await waitFor(() =>
    expect(screen.queryByText('This address is taken')).toBeNull(),
  )
  expect(field('Booking page address').value).toBe('judo-kids-phuket')
})

test('the new password can be shown', async () => {
  fakeApi({ 'GET /api/me': [401] })
  renderApp('/sign-up')

  const password = await screen.findByLabelText('Password')
  fireEvent.click(screen.getByRole('button', { name: 'Show password' }))
  expect(password.getAttribute('type')).toBe('text')
})
