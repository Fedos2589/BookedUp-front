// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { account, fakeApi } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const businessId = account.businesses[0].id
const api = (path: string) => `/api/businesses/${businessId}${path}`
const asMaster = {
  user: {
    id: '00000000-0000-4000-8000-000000000012',
    email: 'v@example.com',
    name: 'Vera',
  },
  businesses: [{ ...account.businesses[0], role: 'MASTER' }],
}
const vera = {
  id: '00000000-0000-4000-8000-000000000021',
  name: 'Vera',
  userId: asMaster.user.id,
  archived: false,
  scheduleMode: 'GROUPS',
}
const groupsRoute = `/staff/${vera.id}/groups`
const timeOffRoute = `/staff/${vera.id}/time-off`
const football = {
  id: '00000000-0000-4000-8000-000000000041',
  title: 'Football, kids 7–10',
  description: 'Boots\nWater\nShin guards\nA towel\nA ball',
  weekdays: [2, 4],
  startMinute: 15 * 60,
  durationMinutes: 60,
  capacity: 12,
  cancellations: [],
}

function withGroups(extra: Parameters<typeof fakeApi>[0] = {}) {
  return fakeApi({
    'GET /api/me': [200, asMaster],
    [`GET ${api('/staff')}`]: [200, [vera]],
    [`GET ${api(timeOffRoute)}`]: [200, []],
    [`GET ${api(groupsRoute)}`]: [200, [football]],
    ...extra,
  })
}

// happy-dom lays nothing out: stand in for a description the 3-line clamp cuts.
function clampCutsText(cut: boolean) {
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(
    cut ? 90 : 40,
  )
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(40)
}

test('groups: a card shows title, days, time and seats', async () => {
  clampCutsText(false)
  withGroups()
  renderApp('/schedule')

  expect(await screen.findByText('Football, kids 7–10')).toBeTruthy()
  expect(
    screen.getByText(/Tue, Thu · 15:00–16:00 · up to 12 people/),
  ).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'more' })).toBeNull()
})

test('groups: a description the clamp cuts has «more», which expands and collapses it', async () => {
  clampCutsText(true)
  withGroups()
  renderApp('/schedule')

  const text = await screen.findByText(/A ball/)
  expect(text.className).toMatch(/clamped/)
  fireEvent.click(screen.getByRole('button', { name: 'more' }))
  expect(text.className).not.toMatch(/clamped/)
  fireEvent.click(screen.getByRole('button', { name: 'less' }))
  expect(text.className).toMatch(/clamped/)
})

test('groups: delete asks first, then removes the group and the list reloads', async () => {
  const { calls, set } = withGroups({
    [`DELETE ${api(`${groupsRoute}/${football.id}`)}`]: [204],
  })
  renderApp('/schedule')

  fireEvent.click(
    await screen.findByRole('button', { name: 'Delete Football, kids 7–10' }),
  )
  expect(calls.some((c) => c.route.startsWith('DELETE'))).toBe(false)
  set(`GET ${api(groupsRoute)}`, [200, []])
  fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))

  expect(await screen.findByText('No groups yet.')).toBeTruthy()
  expect(screen.queryByText('Football, kids 7–10')).toBeNull()
})

test('groups: a refused delete says so and keeps the group', async () => {
  withGroups({
    [`DELETE ${api(`${groupsRoute}/${football.id}`)}`]: [500],
  })
  renderApp('/schedule')

  fireEvent.click(
    await screen.findByRole('button', { name: 'Delete Football, kids 7–10' }),
  )
  fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))

  expect(await screen.findByText(/Couldn't delete the group/)).toBeTruthy()
  expect(screen.getByText('Football, kids 7–10')).toBeTruthy()
})

test('groups: no groups says so; a list that fails to load can be retried', async () => {
  const { set } = withGroups({ [`GET ${api(groupsRoute)}`]: [500] })
  renderApp('/schedule')

  expect(await screen.findByText("Couldn't load the groups")).toBeTruthy()
  set(`GET ${api(groupsRoute)}`, [200, []])
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  expect(await screen.findByText('No groups yet.')).toBeTruthy()
})

const sendTime = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } })

async function fillGroup() {
  fireEvent.change(await screen.findByLabelText('Name'), {
    target: { value: ' Chess ' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Sat' }))
  fireEvent.click(screen.getByRole('button', { name: 'Mon' }))
  sendTime('Starts at', '10:00')
  sendTime('Ends at', '10:45')
  fireEvent.change(screen.getByLabelText('Seats'), { target: { value: '3' } })
}

test('groups: a new group is posted with the days, the length and the seats', async () => {
  const { calls, set } = withGroups({
    [`POST ${api(groupsRoute)}`]: [201, { ...football, id: 'new' }],
  })
  renderApp('/schedule')

  fireEvent.click(await screen.findByRole('button', { name: '+ Group' }))
  await fillGroup()
  set(`GET ${api(groupsRoute)}`, [
    200,
    [football, { ...football, id: 'new', title: 'Chess' }],
  ])
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))

  expect(await screen.findByText('Chess')).toBeTruthy()
  expect(calls.find((c) => c.route.startsWith('POST'))?.body).toEqual({
    title: 'Chess',
    description: null,
    weekdays: [1, 6],
    startMinute: 600,
    durationMinutes: 45,
    capacity: 3,
  })
})

test('groups: saving an empty form asks for the fields and sends nothing', async () => {
  const { calls } = withGroups()
  renderApp('/schedule')

  fireEvent.click(await screen.findByRole('button', { name: '+ Group' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Save' }))

  expect(await screen.findByText('Pick at least one day')).toBeTruthy()
  expect(screen.getByText('A whole number from 1 to 1000')).toBeTruthy()
  expect(calls.some((c) => c.route.startsWith('POST'))).toBe(false)
})

test('groups: a changed group is put with its id', async () => {
  const { calls } = withGroups({
    [`PUT ${api(`${groupsRoute}/${football.id}`)}`]: [200, football],
  })
  renderApp('/schedule')

  fireEvent.click(
    await screen.findByRole('button', { name: 'Change Football, kids 7–10' }),
  )
  const name = await screen.findByLabelText('Name')
  expect((name as HTMLInputElement).value).toBe('Football, kids 7–10')
  fireEvent.change(name, { target: { value: 'Football' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))

  await waitFor(() =>
    expect(calls.find((c) => c.route.startsWith('PUT'))).toMatchObject({
      route: `PUT ${api(`${groupsRoute}/${football.id}`)}`,
      body: {
        title: 'Football',
        weekdays: [2, 4],
        startMinute: 900,
        durationMinutes: 60,
        capacity: 12,
      },
    }),
  )
})

test('groups: a clash with another session names it and keeps the dialog', async () => {
  withGroups({
    [`POST ${api(groupsRoute)}`]: [
      409,
      {
        statusCode: 409,
        error: 'Conflict',
        message: 'overlap',
        field: 'startMinute',
        conflictsWith: {
          kind: 'group',
          id: football.id,
          title: football.title,
          date: null,
        },
      },
    ],
  })
  renderApp('/schedule')

  fireEvent.click(await screen.findByRole('button', { name: '+ Group' }))
  await fillGroup()
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))

  expect(
    await screen.findByText(/Overlaps another session: Football, kids 7–10/),
  ).toBeTruthy()
  expect(screen.getByLabelText('Name')).toBeTruthy()
})
