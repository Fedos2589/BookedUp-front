// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { account, fakeApi } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const TOKEN = 'tok_EN-abc123'
const PREVIEW = `GET /api/invitations/${TOKEN}`
const preview = { businessName: 'Judo Kids', role: 'MASTER', invitedBy: 'Anna' }

// Someone with no business yet: they come to the page to join one.
const boris = {
  user: {
    id: '00000000-0000-4000-8000-000000000009',
    email: 'boris@example.com',
    name: 'Boris',
  },
  businesses: [],
}
const borisInJudoKids = {
  ...boris,
  businesses: [{ ...account.businesses[0], role: 'MASTER' }],
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label, { exact: true }), {
    target: { value },
  })
}

test('a guest sees who invites them, where and as whom', async () => {
  fakeApi({ 'GET /api/me': [401], [PREVIEW]: [200, preview] })
  renderApp(`/invite/${TOKEN}`)

  expect(
    await screen.findByRole('heading', { name: 'Join Judo Kids' }),
  ).toBeTruthy()
  expect(screen.getByText('Anna invites you as a master')).toBeTruthy()
})

test('without an inviter the page still says the role', async () => {
  fakeApi({
    'GET /api/me': [401],
    [PREVIEW]: [200, { ...preview, invitedBy: null }],
  })
  renderApp(`/invite/${TOKEN}`)

  expect(await screen.findByText("You're invited as a master")).toBeTruthy()
})

test('a guest signs up through the link and lands in the business', async () => {
  const api = fakeApi({
    'GET /api/me': [401],
    [PREVIEW]: [200, preview],
    [`POST /api/invitations/${TOKEN}/sign-up`]: () => {
      api.set('GET /api/me', [200, borisInJudoKids])
      return [
        201,
        { user: boris.user, business: borisInJudoKids.businesses[0] },
      ]
    },
  })
  const { router } = renderApp(`/invite/${TOKEN}`)
  await screen.findByRole('heading', { name: 'Join Judo Kids' })

  fill('Your name', 'Boris')
  fill('Email', 'boris@example.com')
  fill('Password', 'long enough pass')
  fireEvent.click(
    screen.getByRole('button', { name: 'Create account and join' }),
  )

  expect(await screen.findByRole('heading', { name: 'Judo Kids' })).toBeTruthy()
  expect(router.state.location.pathname).toBe('/')
  expect(api.calls).toContainEqual({
    route: `POST /api/invitations/${TOKEN}/sign-up`,
    body: {
      name: 'Boris',
      email: 'boris@example.com',
      password: 'long enough pass',
    },
  })
})

test('a short password is caught before any request', async () => {
  const api = fakeApi({ 'GET /api/me': [401], [PREVIEW]: [200, preview] })
  renderApp(`/invite/${TOKEN}`)
  await screen.findByRole('heading', { name: 'Join Judo Kids' })

  fill('Your name', 'Boris')
  fill('Email', 'boris@example.com')
  fill('Password', 'short')
  fireEvent.click(
    screen.getByRole('button', { name: 'Create account and join' }),
  )

  expect(await screen.findByText('At least 8 characters')).toBeTruthy()
  expect(api.calls.map((c) => c.route)).not.toContain(
    `POST /api/invitations/${TOKEN}/sign-up`,
  )
})

test('a registered email is told to sign in, and signing in comes back to the invitation', async () => {
  const api = fakeApi({
    'GET /api/me': [401],
    [PREVIEW]: [200, preview],
    [`POST /api/invitations/${TOKEN}/sign-up`]: [
      409,
      {
        statusCode: 409,
        error: 'Conflict',
        message: 'This email is already registered',
        field: 'email',
      },
    ],
    'POST /api/auth/sign-in': () => {
      api.set('GET /api/me', [200, boris])
      return [200, boris]
    },
  })
  const { router } = renderApp(`/invite/${TOKEN}`)
  await screen.findByRole('heading', { name: 'Join Judo Kids' })

  fill('Your name', 'Boris')
  fill('Email', 'boris@example.com')
  fill('Password', 'long enough pass')
  fireEvent.click(
    screen.getByRole('button', { name: 'Create account and join' }),
  )
  expect(
    await screen.findByText('This email is already registered'),
  ).toBeTruthy()

  fireEvent.click(screen.getByRole('link', { name: 'Sign in' }))
  await screen.findByRole('heading', { name: 'Sign in' })
  fill('Email', 'boris@example.com')
  fill('Password', 'long enough pass')
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

  expect(await screen.findByRole('button', { name: 'Join' })).toBeTruthy()
  expect(router.state.location.pathname).toBe(`/invite/${TOKEN}`)
})

test('the offered schedule taken meanwhile is said on the form', async () => {
  fakeApi({
    'GET /api/me': [401],
    [PREVIEW]: [200, preview],
    [`POST /api/invitations/${TOKEN}/sign-up`]: [
      409,
      {
        statusCode: 409,
        error: 'Conflict',
        message:
          'The offered schedule is no longer free; ask for a new invitation',
      },
    ],
  })
  renderApp(`/invite/${TOKEN}`)
  await screen.findByRole('heading', { name: 'Join Judo Kids' })

  fill('Your name', 'Boris')
  fill('Email', 'boris@example.com')
  fill('Password', 'long enough pass')
  fireEvent.click(
    screen.getByRole('button', { name: 'Create account and join' }),
  )

  expect(
    await screen.findByText(
      "Couldn't join: you may already be in this team, or the schedule offered to you is taken. Ask for a new invitation.",
    ),
  ).toBeTruthy()
})

test('a signed-in account joins with one button and lands in the business', async () => {
  const api = fakeApi({
    'GET /api/me': [200, boris],
    [PREVIEW]: [200, preview],
    [`POST /api/invitations/${TOKEN}/accept`]: () => {
      api.set('GET /api/me', [200, borisInJudoKids])
      return [200, borisInJudoKids.businesses[0]]
    },
  })
  const { router } = renderApp(`/invite/${TOKEN}`)

  expect(await screen.findByText('Signed in as boris@example.com')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Join' }))

  expect(await screen.findByRole('heading', { name: 'Judo Kids' })).toBeTruthy()
  expect(router.state.location.pathname).toBe('/')
  expect(api.calls.map((c) => c.route)).toContain(
    `POST /api/invitations/${TOKEN}/accept`,
  )
})

test('joining a team the account is already in is reported', async () => {
  fakeApi({
    'GET /api/me': [200, account],
    [PREVIEW]: [200, preview],
    [`POST /api/invitations/${TOKEN}/accept`]: [
      409,
      {
        statusCode: 409,
        error: 'Conflict',
        message: 'Already a member of this business',
      },
    ],
  })
  renderApp(`/invite/${TOKEN}`)

  fireEvent.click(await screen.findByRole('button', { name: 'Join' }))

  expect(
    await screen.findByText(
      "Couldn't join: you may already be in this team, or the schedule offered to you is taken. Ask for a new invitation.",
    ),
  ).toBeTruthy()
})

test('a signed-in account can sign out and join as someone else', async () => {
  const api = fakeApi({
    'GET /api/me': [200, account],
    [PREVIEW]: [200, preview],
    'POST /api/auth/sign-out': () => {
      api.set('GET /api/me', [401])
      return [204]
    },
  })
  const { router } = renderApp(`/invite/${TOKEN}`)

  fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }))

  expect(
    await screen.findByRole('button', { name: 'Create account and join' }),
  ).toBeTruthy()
  expect(router.state.location.pathname).toBe(`/invite/${TOKEN}`)
})

test('a used, revoked or expired link says it no longer works', async () => {
  fakeApi({ 'GET /api/me': [401], [PREVIEW]: [404] })
  renderApp(`/invite/${TOKEN}`)

  expect(
    await screen.findByRole('heading', {
      name: 'This invitation no longer works',
    }),
  ).toBeTruthy()
  expect(
    screen.queryByRole('button', { name: 'Create account and join' }),
  ).toBeNull()
})

test('a failed preview offers to try again', async () => {
  const api = fakeApi({ 'GET /api/me': [401], [PREVIEW]: [500] })
  renderApp(`/invite/${TOKEN}`)

  const retry = await screen.findByRole('button', { name: 'Try again' })
  api.set(PREVIEW, [200, preview])
  fireEvent.click(retry)

  expect(
    await screen.findByRole('heading', { name: 'Join Judo Kids' }),
  ).toBeTruthy()
})

test('sign in returns only to an invitation, not to any address it is given', async () => {
  const api = fakeApi({
    'GET /api/me': [401],
    'POST /api/auth/sign-in': () => {
      api.set('GET /api/me', [200, account])
      return [200, account]
    },
  })
  const { router } = renderApp('/sign-in?invitation=%2F%2Fevil.example')
  await screen.findByRole('heading', { name: 'Sign in' })

  fill('Email', 'anna@example.com')
  fill('Password', 'correct horse')
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))

  expect(await screen.findByRole('heading', { name: 'Judo Kids' })).toBeTruthy()
  expect(router.state.location.pathname).toBe('/')
})

test('someone already signed in opening sign in for an invitation goes to it', async () => {
  fakeApi({ 'GET /api/me': [200, boris], [PREVIEW]: [200, preview] })
  const { router } = renderApp(`/sign-in?invitation=${TOKEN}`)

  expect(await screen.findByRole('button', { name: 'Join' })).toBeTruthy()
  expect(router.state.location.pathname).toBe(`/invite/${TOKEN}`)
})
