// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { account, fakeApi } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const businessId = account.businesses[0].id
const api = (path: string) => `/api/businesses/${businessId}${path}`
const vera = {
  id: '00000000-0000-4000-8000-000000000021',
  name: 'Vera',
  userId: '00000000-0000-4000-8000-000000000012',
  archived: false,
  scheduleMode: 'HOURS',
}
const petr = {
  id: '00000000-0000-4000-8000-000000000022',
  name: 'Petr',
  userId: null,
  archived: false,
  scheduleMode: 'HOURS',
}
const members = [
  {
    userId: account.user.id,
    name: 'Anna',
    email: 'anna@example.com',
    role: 'OWNER',
    staffId: null,
  },
  {
    userId: vera.userId,
    name: 'Vera',
    email: 'vera@example.com',
    role: 'MASTER',
    staffId: vera.id,
  },
]
const asMaster = {
  user: { id: vera.userId, email: 'vera@example.com', name: 'Vera' },
  businesses: [{ ...account.businesses[0], role: 'MASTER' }],
}

test('the owner opens the schedule from the navigation, picks a master and switches the mode', async () => {
  const staff = [vera, petr]
  const { calls } = fakeApi({
    'GET /api/me': [200, account],
    [`GET ${api('/members')}`]: [200, members],
    [`GET ${api('/staff')}`]: [200, staff],
    [`PUT ${api(`/staff/${vera.id}/schedule-mode`)}`]: [
      200,
      { mode: 'GROUPS' },
    ],
  })
  renderApp('/')
  fireEvent.click(await screen.findByRole('link', { name: 'Schedule' }))

  expect(await screen.findByRole('heading', { name: 'Schedule' })).toBeTruthy()
  expect(await screen.findByRole('combobox', { name: 'Master' })).toBeTruthy()
  const hours = await screen.findByRole('tab', { name: 'One-to-one' })
  expect(hours.getAttribute('aria-selected')).toBe('true')

  vi.stubGlobal(
    'fetch',
    ((original) => (url: string, init?: RequestInit) => {
      if (init?.method === 'PUT') vera.scheduleMode = 'GROUPS'
      return original(url, init)
    })(fetch),
  )
  fireEvent.click(screen.getByRole('tab', { name: 'Groups' }))

  await waitFor(() =>
    expect(
      screen.getByRole('tab', { name: 'Groups' }).getAttribute('aria-selected'),
    ).toBe('true'),
  )
  expect(calls.find((c) => c.route.startsWith('PUT'))?.body).toEqual({
    mode: 'GROUPS',
  })
})

test('a master sees only their own schedule: no picker, and no members request', async () => {
  const { calls } = fakeApi({
    'GET /api/me': [200, asMaster],
    [`GET ${api('/staff')}`]: [200, [vera, petr]],
  })
  renderApp('/schedule')

  expect(await screen.findByRole('tab', { name: 'One-to-one' })).toBeTruthy()
  expect(screen.queryByRole('combobox', { name: 'Master' })).toBeNull()
  expect(calls.some((c) => c.route.includes('/members'))).toBe(false)
})

test('a master without a schedule is told there is none', async () => {
  fakeApi({
    'GET /api/me': [200, asMaster],
    [`GET ${api('/staff')}`]: [200, [petr]],
  })
  renderApp('/schedule')

  expect(await screen.findByText(/no schedule to edit/)).toBeTruthy()
})
