// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'

import { fakeApi } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

afterEach(() => {
  cleanup()
  localStorage.clear()
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
    JSON.stringify({ manageLink: 'x', startsAt: '2026-11-24T09:00:00.000Z' }),
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
