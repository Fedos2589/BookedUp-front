// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
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
