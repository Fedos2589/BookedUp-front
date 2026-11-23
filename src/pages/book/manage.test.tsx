// @vitest-environment happy-dom
import { cleanup, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'

import { fakeApi } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

afterEach(cleanup)

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
