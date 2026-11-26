// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { fakeApi as stubApi } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-23T10:00:00Z'))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const SESSION = 'GET /api/public/client-session'
const BUSINESS = 'GET /api/public/businesses/judo'
const MINE = 'GET /api/public/businesses/judo/my-bookings'
const SLOTS =
  'GET /api/public/businesses/judo/slots?from=2026-11-23&to=2026-12-06'
const MOVE = 'PATCH /api/public/businesses/judo/my-bookings/b1'
const CANCEL = 'POST /api/public/businesses/judo/my-bookings/b1/cancel'
const ANNA = '11111111-1111-4111-8111-111111111111'

const business = {
  name: 'Judo Kids',
  slug: 'judo',
  timeZone: 'Europe/Berlin',
  channels: { telegram: true, whatsapp: false, push: false, email: false },
  pushKey: null,
  clientSignIn: true,
  masters: [{ id: ANNA, name: 'Anna', scheduleMode: 'HOURS' }],
}

const mine = (id: string, over = {}) => ({
  id,
  clientName: 'Ira',
  staffId: ANNA,
  staffName: 'Anna',
  startsAt: '2026-11-24T09:00:00.000Z',
  endsAt: '2026-11-24T10:00:00.000Z',
  title: null,
  status: 'BOOKED',
  groupId: null,
  oneOffSessionId: null,
  canChange: true,
  ...over,
})

const slot = (startsAt: string, endsAt: string) => ({
  staffId: ANNA,
  startsAt,
  endsAt,
  title: null,
  description: null,
  capacity: 1,
  booked: 0,
  full: false,
  groupId: null,
  oneOffSessionId: null,
})

const api = (routes: Parameters<typeof stubApi>[0] = {}) =>
  stubApi({
    [SESSION]: [200, { phone: '+66812345678' }],
    [BUSINESS]: [200, business],
    [MINE]: [200, { bookings: [mine('b1')] }],
    [SLOTS]: [
      200,
      [slot('2026-11-25T13:00:00.000Z', '2026-11-25T14:00:00.000Z')],
    ],
    ...routes,
  })

test('moves my booking, and the list is asked for again', async () => {
  const fake = api({ [MOVE]: [200, mine('b1')] })
  renderApp('/book/judo/my/b1')

  expect(await screen.findByText(/10:00–11:00/)).toBeTruthy()
  fireEvent.click(await screen.findByRole('button', { name: 'Change time' }))
  fireEvent.click(await screen.findByRole('radio', { name: /14:00/ }))
  fake.set(MINE, [
    200,
    {
      bookings: [
        mine('b1', {
          startsAt: '2026-11-25T13:00:00.000Z',
          endsAt: '2026-11-25T14:00:00.000Z',
        }),
      ],
    },
  ])
  fireEvent.click(await screen.findByRole('button', { name: 'Move' }))

  expect(await screen.findByText(/14:00–15:00/)).toBeTruthy()
  expect(fake.calls.find((c) => c.route === MOVE)?.body).toEqual({
    staffId: ANNA,
    startsAt: '2026-11-25T13:00:00.000Z',
    endsAt: '2026-11-25T14:00:00.000Z',
  })
  expect(fake.calls.filter((c) => c.route === MINE).length).toBe(2)
})

test('cancels my booking and shows it cancelled', async () => {
  const fake = api({
    [CANCEL]: [200, mine('b1', { status: 'CANCELLED', canChange: false })],
  })
  renderApp('/book/judo/my/b1')

  fireEvent.click(await screen.findByRole('button', { name: 'Cancel booking' }))
  // The back's list holds no cancelled booking: the cancel's own answer shows.
  fake.set(MINE, [200, { bookings: [] }])
  fireEvent.click(await screen.findByRole('button', { name: 'Yes, cancel' }))

  expect(await screen.findByText('Cancelled')).toBeTruthy()
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Cancel booking' })).toBeNull(),
  )
  expect(fake.calls.some((c) => c.route === CANCEL)).toBe(true)
})

test('an id that is not in my list says so and leads to step 1', async () => {
  api()
  renderApp('/book/judo/my/other')

  expect(
    await screen.findByText("This booking isn't yours or is gone"),
  ).toBeTruthy()
  expect(
    screen.getByRole('link', { name: 'Book online' }).getAttribute('href'),
  ).toBe('/book/judo')
})

test('without a session the phone is confirmed first and nothing is asked about bookings', async () => {
  const fake = api({
    [SESSION]: [200, { phone: null }],
    'POST /api/public/client-login': [201, { url: 'https://t.me/bot?start=a' }],
    'GET /api/public/client-login': [200, { status: 'pending' }],
  })
  renderApp('/book/judo/my/b1')

  expect(await screen.findByText('Open Telegram')).toBeTruthy()
  expect(fake.calls.some((c) => c.route === MINE)).toBe(false)
})

const SIGN_IN = { statusCode: 401, code: 'clientSignIn', message: 'x' }
const START = 'POST /api/public/client-login'
const LOGIN = {
  [START]: [201, { url: 'https://t.me/bot?start=a' }] as [number, unknown],
  'GET /api/public/client-login': [200, { status: 'pending' }] as [
    number,
    unknown,
  ],
}

test('a list refused for the session asks to confirm the phone again', async () => {
  const fake = api({ ...LOGIN, [MINE]: [401, SIGN_IN] })
  // The phone is gone by the time the session is asked for again.
  setTimeout(() => fake.set(SESSION, [200, { phone: null }]), 0)
  renderApp('/book/judo/my/b1')

  expect(await screen.findByText('Open Telegram')).toBeTruthy()
})

test('a cancel refused for the session asks to confirm the phone again', async () => {
  const fake = api({ ...LOGIN, [CANCEL]: [401, SIGN_IN] })
  renderApp('/book/judo/my/b1')

  fireEvent.click(await screen.findByRole('button', { name: 'Cancel booking' }))
  fake.set(SESSION, [200, { phone: null }])
  fireEvent.click(await screen.findByRole('button', { name: 'Yes, cancel' }))

  expect(await screen.findByText('Open Telegram')).toBeTruthy()
})

test('a business that is not there is "no such page"', async () => {
  api({ [BUSINESS]: [404, { statusCode: 404, message: 'x' }] })
  renderApp('/book/judo/my/b1')

  expect(await screen.findByText(/no such page|doesn't exist/i)).toBeTruthy()
})

test('with Telegram off no login is started', async () => {
  const fake = api({
    [SESSION]: [200, { phone: null }],
    [BUSINESS]: [200, { ...business, clientSignIn: false }],
  })
  renderApp('/book/judo/my/b1')

  expect(await screen.findByText("Online booking isn't available")).toBeTruthy()
  expect(fake.calls.some((c) => c.route === START)).toBe(false)
})
