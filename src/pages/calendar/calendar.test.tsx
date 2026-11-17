// @vitest-environment happy-dom
import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { addDays, dateIn } from '@/dates'
import { account, fakeApi } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

const businessId = account.businesses[0].id
const staff = [
  {
    id: '00000000-0000-4000-8000-000000000021',
    name: 'Vera',
    userId: null,
    archived: false,
    scheduleMode: 'HOURS',
  },
]

test('without a master there is nothing to show, and the page says why', async () => {
  fakeApi({
    'GET /api/me': [200, account],
    [`GET /api/businesses/${businessId}/staff`]: [200, []],
  })
  renderApp('/calendar')
  expect(
    await screen.findByText(
      'There are no masters to show yet. Add one on the Team page.',
    ),
  ).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Today' })).toBeNull()
})

test('the navigation opens the calendar and the arrows move its date', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-17T12:00:00Z'))
  fakeApi({
    'GET /api/me': [200, account],
    [`GET /api/businesses/${businessId}/staff`]: [200, staff],
  })
  const { router } = renderApp('/')
  fireEvent.click(await screen.findByRole('link', { name: 'Calendar' }))

  expect(await screen.findByRole('heading', { name: 'Calendar' })).toBeTruthy()
  expect(router.state.location.pathname).toBe('/calendar')

  const dateNow = () => (router.state.location.search as { date?: string }).date
  const today = dateIn(new Date(), account.businesses[0].timeZone)!

  fireEvent.click(await screen.findByRole('tab', { name: 'Week' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Next week' }))
  await waitFor(() => expect(dateNow()).toBe(addDays(today, 7)))
  expect((router.state.location.search as { view?: string }).view).toBe('week')

  fireEvent.click(await screen.findByRole('button', { name: 'Today' }))
  await waitFor(() => expect(dateNow()).toBe(today))
})

const day = '2026-11-17' // a Tuesday; the week is 16–22 Nov
const query = (from: string, to: string, staffId?: string) =>
  `from=${from}&to=${to}${staffId ? `&staffId=${staffId}` : ''}&includePast=true`
const booking = {
  id: '00000000-0000-4000-8000-000000000031',
  staffId: staff[0].id,
  startsAt: '2026-11-17T03:00:00Z', // 10:00 in Bangkok
  endsAt: '2026-11-17T04:00:00Z',
  status: 'BOOKED',
  clientName: 'Olga',
  clientPhone: '+66000000',
  note: null,
  groupId: null,
  oneOffSessionId: null,
}
const petr = {
  ...staff[0],
  id: '00000000-0000-4000-8000-000000000022',
  name: 'Petr',
}

test('the day view has a column per master and the bookings of the day, past meetings asked for', async () => {
  const api = fakeApi({
    'GET /api/me': [200, account],
    [`GET /api/businesses/${businessId}/staff`]: [200, [...staff, petr]],
    [`GET /api/businesses/${businessId}/appointments?${query(day, day)}`]: [
      200,
      [booking],
    ],
    [`GET /api/businesses/${businessId}/slots?${query(day, day)}`]: [200, []],
  })
  renderApp(`/calendar?date=${day}`)

  const grid = await screen.findByRole('group', { name: 'Bookings' })
  expect(await within(grid).findByText(/Olga/)).toBeTruthy()
  expect(within(grid).getByRole('group', { name: 'Vera' })).toBeTruthy()
  expect(within(grid).getByRole('group', { name: 'Petr' })).toBeTruthy()
  expect(api.calls.map((c) => c.route)).toContain(
    `GET /api/businesses/${businessId}/slots?${query(day, day)}`,
  )
})

test('the week view has a column per day of one master', async () => {
  fakeApi({
    'GET /api/me': [200, account],
    [`GET /api/businesses/${businessId}/staff`]: [200, staff],
    [`GET /api/businesses/${businessId}/appointments?${query('2026-11-16', '2026-11-22', staff[0].id)}`]:
      [200, [booking]],
    [`GET /api/businesses/${businessId}/slots?${query('2026-11-16', '2026-11-22', staff[0].id)}`]:
      [200, []],
  })
  renderApp(`/calendar?view=week&date=${day}`)

  const grid = await screen.findByRole('group', { name: 'Bookings' })
  expect(await within(grid).findByText(/Olga/)).toBeTruthy()
  expect(within(grid).getAllByRole('group')).toHaveLength(7)
})

test('a failed load says so and offers to try again', async () => {
  fakeApi({
    'GET /api/me': [200, account],
    [`GET /api/businesses/${businessId}/staff`]: [200, staff],
    [`GET /api/businesses/${businessId}/appointments?${query(day, day)}`]: [
      500,
    ],
    [`GET /api/businesses/${businessId}/slots?${query(day, day)}`]: [200, []],
  })
  renderApp(`/calendar?date=${day}`)
  expect(await screen.findByRole('alert')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
})
