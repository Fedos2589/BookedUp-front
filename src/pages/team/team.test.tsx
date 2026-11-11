// @vitest-environment happy-dom
import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { account, fakeApi } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const businessId = account.businesses[0].id
const api = (path: string) => `/api/businesses/${businessId}${path}`

const withRole = (role: string) => ({
  ...account,
  businesses: [{ ...account.businesses[0], role }],
})

const owner = {
  userId: account.user.id,
  name: 'Anna',
  email: 'anna@example.com',
  role: 'OWNER',
  staffId: null,
}
const admin = {
  userId: '00000000-0000-4000-8000-000000000011',
  name: 'Boris',
  email: 'boris@example.com',
  role: 'ADMIN',
  staffId: null,
}
const master = {
  userId: '00000000-0000-4000-8000-000000000012',
  name: 'Vera',
  email: 'vera@example.com',
  role: 'MASTER',
  staffId: '00000000-0000-4000-8000-000000000021',
}

const team = (me = account) => ({
  'GET /api/me': [200, me] as [number, unknown],
  [`GET ${api('/members')}`]: [200, [owner, admin, master]] as [
    number,
    unknown,
  ],
})

test('the owner opens the team from the navigation and sees its members', async () => {
  fakeApi(team())
  const { router } = renderApp('/')
  await screen.findByRole('heading', { name: 'Judo Kids' })

  fireEvent.click(screen.getByRole('link', { name: 'Team' }))
  expect(await screen.findByRole('heading', { name: 'Team' })).toBeTruthy()
  expect(router.state.location.pathname).toBe('/team')

  const members = await screen.findByRole('list', { name: 'Members' })
  const rows = members.querySelectorAll(':scope > li')
  expect([...rows].map((row) => row.textContent)).toEqual([
    expect.stringMatching(/Anna.*anna@example\.com.*Owner/),
    expect.stringMatching(/Boris.*boris@example\.com.*Admin/),
    expect.stringMatching(/Vera.*vera@example\.com.*Master/),
  ])
})

test('an admin sees the team too', async () => {
  fakeApi(team(withRole('ADMIN')))
  renderApp('/team')

  expect(await screen.findByRole('list', { name: 'Members' })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Team' })).toBeTruthy()
})

test('a master has no team: no link, and the address lands on the dashboard', async () => {
  const calls = fakeApi(team(withRole('MASTER'))).calls
  const { router } = renderApp('/team')

  await screen.findByRole('heading', { name: 'Judo Kids' })
  await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  expect(screen.queryByRole('link', { name: 'Team' })).toBeNull()
  // The back would refuse it with 403: it is not even asked.
  expect(calls.map((call) => call.route)).not.toContain(
    `GET ${api('/members')}`,
  )
})

test('when the members fail to load, the team offers to try again', async () => {
  const fake = fakeApi({ ...team(), [`GET ${api('/members')}`]: [502] })
  renderApp('/team')

  const retry = await screen.findByRole('button', { name: 'Try again' })
  fake.set(`GET ${api('/members')}`, [200, [owner, admin, master]])
  fireEvent.click(retry)

  expect(await screen.findByRole('list', { name: 'Members' })).toBeTruthy()
})

const rowOf = (name: string) => {
  const members = screen.getByRole('list', { name: 'Members' })
  const row = [...members.querySelectorAll(':scope > li')].find((li) =>
    li.textContent?.includes(name),
  )
  if (!(row instanceof HTMLElement)) throw new Error(`no row for ${name}`)
  return row
}

const buttonsIn = (row: HTMLElement) =>
  [...row.querySelectorAll('button')].map((button) => button.textContent)

test('the owner moves a member to the other role', async () => {
  const fake = fakeApi({
    ...team(),
    [`PATCH ${api(`/members/${admin.userId}`)}`]: [
      200,
      { ...admin, role: 'MASTER' },
    ],
  })
  renderApp('/team')
  await screen.findByRole('list', { name: 'Members' })

  expect(buttonsIn(rowOf('Anna'))).toEqual([])
  expect(buttonsIn(rowOf('Vera'))).toEqual(['Make admin', 'Remove'])

  fake.set(`GET ${api('/members')}`, [
    200,
    [owner, { ...admin, role: 'MASTER' }, master],
  ])
  fireEvent.click(
    within(rowOf('Boris')).getByRole('button', { name: 'Make master' }),
  )

  await waitFor(() => expect(rowOf('Boris').textContent).toMatch(/Master/))
  expect(fake.calls).toContainEqual({
    route: `PATCH ${api(`/members/${admin.userId}`)}`,
    body: { role: 'MASTER' },
  })
})

test('an admin can remove a master, and touch nobody else', async () => {
  fakeApi(team(withRole('ADMIN')))
  renderApp('/team')
  await screen.findByRole('list', { name: 'Members' })

  expect(buttonsIn(rowOf('Anna'))).toEqual([])
  expect(buttonsIn(rowOf('Boris'))).toEqual([])
  // Admin → master only: there is no other role to move a master to.
  expect(buttonsIn(rowOf('Vera'))).toEqual(['Remove'])
})

test('removing asks first; cancelling sends nothing', async () => {
  const fake = fakeApi(team())
  renderApp('/team')
  await screen.findByRole('list', { name: 'Members' })

  fireEvent.click(within(rowOf('Vera')).getByRole('button', { name: 'Remove' }))
  const dialog = await screen.findByRole('dialog', {
    name: 'Remove Vera from the team?',
  })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))

  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(fake.calls.map((call) => call.route)).not.toContain(
    `DELETE ${api(`/members/${master.userId}`)}`,
  )
})

test('a removed member leaves the list', async () => {
  const fake = fakeApi({
    ...team(),
    [`DELETE ${api(`/members/${master.userId}`)}`]: [204],
  })
  renderApp('/team')
  await screen.findByRole('list', { name: 'Members' })

  fireEvent.click(within(rowOf('Vera')).getByRole('button', { name: 'Remove' }))
  const dialog = await screen.findByRole('dialog')
  fake.set(`GET ${api('/members')}`, [200, [owner, admin]])
  fireEvent.click(within(dialog).getByRole('button', { name: 'Remove' }))

  await waitFor(() => expect(screen.queryByText('Vera')).toBeNull())
  expect(screen.queryByRole('dialog')).toBeNull()
})

test('a member changed meanwhile: the list reloads and says so', async () => {
  const fake = fakeApi({
    ...team(),
    [`PATCH ${api(`/members/${admin.userId}`)}`]: [409],
  })
  renderApp('/team')
  await screen.findByRole('list', { name: 'Members' })

  fake.set(`GET ${api('/members')}`, [200, [owner, master]])
  fireEvent.click(
    within(rowOf('Boris')).getByRole('button', { name: 'Make master' }),
  )

  expect((await screen.findByRole('alert')).textContent).toBe(
    'Someone changed the team meanwhile. Here it is as it is now.',
  )
  await waitFor(() => expect(screen.queryByText('Boris')).toBeNull())
})
