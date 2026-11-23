// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { deferredAnswer, fakeApi } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

beforeEach(() => {
  // Only the clock: the times offered for a move start from "today".
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-23T10:00:00Z'))
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const MANAGED = 'GET /api/public/bookings/secret-token'

const managed = (over = {}, canChange = true) => ({
  business: { name: 'Judo Kids', slug: 'judo', timeZone: 'Europe/Berlin' },
  booking: {
    staffId: '11111111-1111-4111-8111-111111111111',
    staffName: 'Anna',
    startsAt: '2026-11-24T09:00:00.000Z',
    endsAt: '2026-11-24T10:00:00.000Z',
    title: null,
    status: 'BOOKED',
    groupId: null,
    oneOffSessionId: null,
    ...over,
  },
  canChange,
})

test('shows the booking in the business time zone', async () => {
  fakeApi({ [MANAGED]: [200, managed()] })
  renderApp('/book/judo/manage/secret-token')

  expect(await screen.findByRole('heading', { name: 'Judo Kids' })).toBeTruthy()
  // 09:00Z is 10:00 in Berlin.
  expect(await screen.findByText(/10:00–11:00/)).toBeTruthy()
  expect(screen.getByText(/Anna/)).toBeTruthy()
  expect(screen.getByText('Booked')).toBeTruthy()
})

test('an unknown link says it does not work', async () => {
  fakeApi({ [MANAGED]: [404, { statusCode: 404, message: 'Not found' }] })
  renderApp('/book/judo/manage/secret-token')

  expect(await screen.findByText("This link doesn't work")).toBeTruthy()
})

const CANCEL = 'POST /api/public/bookings/secret-token/cancel'

const openCancel = async () => {
  fireEvent.click(await screen.findByRole('button', { name: 'Cancel booking' }))
  return screen.findByRole('button', { name: 'Yes, cancel' })
}

test('cancels after a confirmation and forgets the saved booking', async () => {
  localStorage.setItem(
    'booking:judo',
    JSON.stringify({ manageLink: LINK, startsAt: '2026-11-24T09:00:00.000Z' }),
  )
  const api = fakeApi({
    [MANAGED]: [200, managed()],
    [CANCEL]: [201, {}],
  })
  renderApp('/book/judo/manage/secret-token')

  fireEvent.click(await openCancel())

  await waitFor(() => expect(localStorage.getItem('booking:judo')).toBeNull())
  expect(api.calls.some((c) => c.route === CANCEL)).toBe(true)
})

test('shows the cancelled status without the cancel button afterwards', async () => {
  const api = fakeApi({
    [MANAGED]: [200, managed()],
    [CANCEL]: [201, {}],
  })
  renderApp('/book/judo/manage/secret-token')
  fireEvent.click(await openCancel())
  api.set(MANAGED, [200, managed({ status: 'CANCELLED' }, false)])

  expect(await screen.findByText('Cancelled')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Cancel booking' })).toBeNull()
})

test('a booking that cannot change has no cancel button', async () => {
  fakeApi({ [MANAGED]: [200, managed({ status: 'DONE' }, false)] })
  renderApp('/book/judo/manage/secret-token')

  expect(await screen.findByText('Done')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Cancel booking' })).toBeNull()
})

test('a refused cancel (already started) falls back to read-only', async () => {
  const api = fakeApi({
    [MANAGED]: [200, managed()],
    [CANCEL]: [409, { statusCode: 409, code: 'badTransition', message: 'x' }],
  })
  renderApp('/book/judo/manage/secret-token')
  fireEvent.click(await openCancel())
  api.set(MANAGED, [200, managed({ status: 'DONE' }, false)])

  expect(await screen.findByText('Done')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Cancel booking' })).toBeNull()
})

const ANNA = '11111111-1111-4111-8111-111111111111'
const BUSINESS = 'GET /api/public/businesses/judo'
const SLOTS =
  'GET /api/public/businesses/judo/slots?from=2026-11-23&to=2026-12-06'
const MOVE = 'PATCH /api/public/bookings/secret-token'

const business = {
  name: 'Judo Kids',
  slug: 'judo',
  timeZone: 'Europe/Berlin',
  masters: [
    { id: ANNA, name: 'Anna', scheduleMode: 'HOURS' },
    {
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Boris',
      scheduleMode: 'HOURS',
    },
  ],
}

const slot = (staffId: string, startsAt: string, endsAt: string) => ({
  staffId,
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

const movable = () => ({
  [MANAGED]: [200, managed()] as [number, unknown],
  [BUSINESS]: [200, business] as [number, unknown],
  [SLOTS]: [
    200,
    [
      slot(ANNA, '2026-11-25T09:00:00.000Z', '2026-11-25T10:00:00.000Z'),
      slot(ANNA, '2026-11-25T13:00:00.000Z', '2026-11-25T14:00:00.000Z'),
      // A group meeting is not offered to an hours booking (finding 9).
      {
        ...slot(ANNA, '2026-11-25T11:00:00.000Z', '2026-11-25T12:00:00.000Z'),
        title: 'Judo',
        groupId: '44444444-4444-4444-8444-444444444444',
      },
      // Another master's time is not offered: a move stays with the master.
      slot(
        '22222222-2222-4222-8222-222222222222',
        '2026-11-25T15:00:00.000Z',
        '2026-11-25T16:00:00.000Z',
      ),
    ],
  ] as [number, unknown],
})

const openMove = async () => {
  fireEvent.click(await screen.findByRole('button', { name: 'Change time' }))
  return screen.findByRole('radio', { name: /14:00/ })
}

test('moves the booking to another time of the same master', async () => {
  const api = fakeApi({
    ...movable(),
    [MOVE]: [200, managed()],
  })
  renderApp('/book/judo/manage/secret-token')

  fireEvent.click(await openMove())
  expect(screen.queryByRole('radio', { name: /16:00/ })).toBeNull()
  expect(screen.queryByRole('radio', { name: /12:00/ })).toBeNull()
  api.set(MANAGED, [
    200,
    managed({
      startsAt: '2026-11-25T13:00:00.000Z',
      endsAt: '2026-11-25T14:00:00.000Z',
    }),
  ])
  fireEvent.click(await screen.findByRole('button', { name: 'Move' }))

  await waitFor(() => expect(screen.queryByRole('radio')).toBeNull())
  expect(screen.getByText(/14:00–15:00/)).toBeTruthy()
  expect(api.calls.find((c) => c.route === MOVE)?.body).toEqual({
    staffId: ANNA,
    startsAt: '2026-11-25T13:00:00.000Z',
    endsAt: '2026-11-25T14:00:00.000Z',
  })
})

test('a time taken meanwhile is said so and stays on the choice', async () => {
  fakeApi({
    ...movable(),
    [MOVE]: [409, { statusCode: 409, code: 'notFree', message: 'x' }],
  })
  renderApp('/book/judo/manage/secret-token')

  fireEvent.click(await openMove())
  fireEvent.click(await screen.findByRole('button', { name: 'Move' }))

  expect(await screen.findByRole('status')).toBeTruthy()
  expect(screen.getByRole('radio', { name: /14:00/ })).toBeTruthy()
})

test('a move refused because it started falls back to read-only', async () => {
  const api = fakeApi({
    ...movable(),
    [MOVE]: [409, { statusCode: 409, code: 'badTransition', message: 'x' }],
  })
  renderApp('/book/judo/manage/secret-token')

  fireEvent.click(await openMove())
  api.set(MANAGED, [200, managed({ status: 'DONE' }, false)])
  fireEvent.click(await screen.findByRole('button', { name: 'Move' }))

  expect(await screen.findByText('Done')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Change time' })).toBeNull()
  expect(screen.queryByRole('radio')).toBeNull()
})

// Review of #49.
test('a failed cancel says so and keeps the button (finding 2)', async () => {
  fakeApi({
    [MANAGED]: [200, managed()],
    [CANCEL]: [500, { statusCode: 500, message: 'x' }],
  })
  renderApp('/book/judo/manage/secret-token')
  fireEvent.click(await openCancel())

  expect(await screen.findByRole('alert')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Cancel booking' })).toBeTruthy()
})

test('a failed move says so and keeps the choice (finding 2)', async () => {
  fakeApi({
    ...movable(),
    [MOVE]: [500, { statusCode: 500, message: 'x' }],
  })
  renderApp('/book/judo/manage/secret-token')
  fireEvent.click(await openMove())
  fireEvent.click(await screen.findByRole('button', { name: 'Move' }))

  expect(await screen.findByRole('alert')).toBeTruthy()
  expect(screen.getByRole('radio', { name: /14:00/ })).toBeTruthy()
})

test('a second press while the move is in flight sends nothing (finding 3)', async () => {
  const later = deferredAnswer()
  const api = fakeApi({ ...movable(), [MOVE]: later.answer })
  renderApp('/book/judo/manage/secret-token')
  fireEvent.click(await openMove())
  const move = await screen.findByRole('button', { name: 'Move' })

  fireEvent.click(move)
  // The button shows the request is on its way, and a press now does nothing.
  await waitFor(() => expect(move.getAttribute('aria-busy')).toBe('true'))
  fireEvent.click(move)

  expect(api.calls.filter((c) => c.route === MOVE)).toHaveLength(1)
  later.send([200, managed()])
})

test('changing one’s mind: back from the times to the booking (finding 4)', async () => {
  fakeApi(movable())
  renderApp('/book/judo/manage/secret-token')
  await openMove()

  fireEvent.click(screen.getByRole('button', { name: 'Back' }))

  expect(screen.queryByRole('radio')).toBeNull()
  expect(screen.getByRole('button', { name: 'Cancel booking' })).toBeTruthy()
})

test('times that fail to load keep one main and one heading (finding 5)', async () => {
  fakeApi({
    ...movable(),
    [SLOTS]: [500, { statusCode: 500, message: 'x' }],
  })
  renderApp('/book/judo/manage/secret-token')
  fireEvent.click(await screen.findByRole('button', { name: 'Change time' }))

  expect(await screen.findByRole('button', { name: 'Try again' })).toBeTruthy()
  expect(screen.getAllByRole('main')).toHaveLength(1)
  expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
})

const LINK = 'https://app.test/book/judo/manage/secret-token'

test('moving updates the remembered booking (finding 7)', async () => {
  localStorage.setItem(
    'booking:judo',
    JSON.stringify({ manageLink: LINK, startsAt: '2026-11-24T09:00:00.000Z' }),
  )
  fakeApi({
    ...movable(),
    [MOVE]: [
      200,
      managed({
        startsAt: '2026-11-25T13:00:00.000Z',
        endsAt: '2026-11-25T14:00:00.000Z',
      }),
    ],
  })
  renderApp('/book/judo/manage/secret-token')
  fireEvent.click(await openMove())
  fireEvent.click(await screen.findByRole('button', { name: 'Move' }))

  await waitFor(() =>
    expect(JSON.parse(localStorage.getItem('booking:judo') ?? '{}')).toEqual({
      manageLink: LINK,
      startsAt: '2026-11-25T13:00:00.000Z',
    }),
  )
})

test('cancelling another booking leaves the remembered one (finding 7)', async () => {
  const saved = JSON.stringify({
    manageLink: 'https://app.test/book/judo/manage/another-token',
    startsAt: '2026-11-30T09:00:00.000Z',
  })
  localStorage.setItem('booking:judo', saved)
  fakeApi({ [MANAGED]: [200, managed()], [CANCEL]: [201, {}] })
  renderApp('/book/judo/manage/secret-token')
  fireEvent.click(await openCancel())

  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(localStorage.getItem('booking:judo')).toBe(saved)
})
