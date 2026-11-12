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
  const { calls, set } = fakeApi({
    'GET /api/me': [200, account],
    [`GET ${api('/members')}`]: [200, members],
    [`GET ${api('/staff')}`]: [200, [vera, petr]],
    [`PUT ${api(`/staff/${vera.id}/schedule-mode`)}`]: () => {
      set(`GET ${api('/staff')}`, [
        200,
        [{ ...vera, scheduleMode: 'GROUPS' }, petr],
      ])
      return [200, { mode: 'GROUPS' }]
    },
  })
  renderApp('/')
  fireEvent.click(await screen.findByRole('link', { name: 'Schedule' }))

  expect(await screen.findByRole('heading', { name: 'Schedule' })).toBeTruthy()
  expect(await screen.findByRole('combobox', { name: 'Master' })).toBeTruthy()
  const hours = await screen.findByRole('tab', { name: 'One-to-one' })
  expect(hours.getAttribute('aria-selected')).toBe('true')

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

  expect(await screen.findByText(/Ask the owner or an admin/)).toBeTruthy()
  expect(screen.queryByText(/Team page/)).toBeNull()
})

test('a failed mode change does not follow to another master', async () => {
  fakeApi({
    'GET /api/me': [200, account],
    [`GET ${api('/members')}`]: [200, members],
    [`GET ${api('/staff')}`]: [200, [vera, petr]],
    [`PUT ${api(`/staff/${vera.id}/schedule-mode`)}`]: [500],
  })
  renderApp('/schedule')
  await screen.findByRole('combobox', { name: 'Master' })
  fireEvent.click(await screen.findByRole('tab', { name: 'Groups' }))
  expect(await screen.findByText(/Couldn.t change the type/)).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: 'Show options' }))
  fireEvent.click(await screen.findByRole('option', { name: 'Petr' }))
  await waitFor(() =>
    expect(screen.queryByText(/Couldn.t change the type/)).toBeNull(),
  )
})

test('a list that fails to reload keeps the page, with no load error', async () => {
  const { set, calls } = fakeApi({
    'GET /api/me': [200, asMaster],
    [`GET ${api('/staff')}`]: [200, [vera]],
    [`PUT ${api(`/staff/${vera.id}/schedule-mode`)}`]: () => {
      set(`GET ${api('/staff')}`, [500])
      return [200, { mode: 'GROUPS' }]
    },
  })
  renderApp('/schedule')
  fireEvent.click(await screen.findByRole('tab', { name: 'Groups' }))

  const staffGets = () =>
    calls.filter((c) => c.route === `GET ${api('/staff')}`).length
  await waitFor(() => expect(staffGets()).toBeGreaterThan(1))
  // The reload failed (and was retried): the page is still the page.
  await waitFor(() =>
    expect(
      screen.getByRole('tab', { name: 'Groups' }).hasAttribute('disabled'),
    ).toBe(false),
  )
  await new Promise((resolve) => setTimeout(resolve, 100))
  expect(screen.queryByText(/Couldn.t load the schedule/)).toBeNull()
})
