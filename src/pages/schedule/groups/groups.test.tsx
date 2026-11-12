// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { account, fakeApi } from '@/test/fakeApi'
import { pickDay } from '@/test/pickDay'
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
const sessionsRoute = `/staff/${vera.id}/one-off-sessions`
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
    [`GET ${api(sessionsRoute)}`]: [200, []],
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

test('groups: a group over midnight is edited with its end on the clock', async () => {
  const night = { ...football, startMinute: 23 * 60, durationMinutes: 90 }
  const { calls } = withGroups({
    [`GET ${api(groupsRoute)}`]: [200, [night]],
    [`PUT ${api(`${groupsRoute}/${football.id}`)}`]: [200, night],
  })
  renderApp('/schedule')

  fireEvent.click(
    await screen.findByRole('button', { name: 'Change Football, kids 7–10' }),
  )
  expect(
    ((await screen.findByLabelText('Ends at')) as HTMLInputElement).value,
  ).toBe('00:30')
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))

  await waitFor(() =>
    expect(calls.find((c) => c.route.startsWith('PUT'))?.body).toMatchObject({
      startMinute: 1380,
      durationMinutes: 90,
    }),
  )
})

test('groups: with only the days missing, focus goes to the days', async () => {
  withGroups()
  renderApp('/schedule')

  fireEvent.click(await screen.findByRole('button', { name: '+ Group' }))
  fireEvent.change(await screen.findByLabelText('Name'), {
    target: { value: 'Chess' },
  })
  sendTime('Starts at', '10:00')
  sendTime('Ends at', '10:45')
  fireEvent.change(screen.getByLabelText('Seats'), { target: { value: '3' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))

  expect(await screen.findByText('Pick at least one day')).toBeTruthy()
  expect(document.activeElement).toBe(
    screen.getByRole('button', { name: 'Mon' }),
  )
})

test('groups: a refused delete is forgotten when another group is opened for change', async () => {
  withGroups({
    [`DELETE ${api(`${groupsRoute}/${football.id}`)}`]: [500],
  })
  renderApp('/schedule')

  fireEvent.click(
    await screen.findByRole('button', { name: 'Delete Football, kids 7–10' }),
  )
  fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))
  expect(await screen.findByText(/Couldn't delete the group/)).toBeTruthy()

  fireEvent.click(
    screen.getByRole('button', { name: 'Change Football, kids 7–10' }),
  )
  await screen.findByLabelText('Name')
  expect(screen.queryByText(/Couldn't delete the group/)).toBeNull()
})

test('groups: a 409 without a name for the clash gets the general message', async () => {
  withGroups({ [`POST ${api(groupsRoute)}`]: [409, { statusCode: 409 }] })
  renderApp('/schedule')

  fireEvent.click(await screen.findByRole('button', { name: '+ Group' }))
  await fillGroup()
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))

  expect(await screen.findByText(/Couldn't save the group/)).toBeTruthy()
})

// Tuesday 17 Nov 2026, noon UTC: the same calendar day in every business zone
// the tests use.
function today() {
  vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-17T12:00:00Z') })
}
const cancellationRoute = (date: string) =>
  api(`${groupsRoute}/${football.id}/cancellations/${date}`)
const openDates = async () =>
  fireEvent.click(
    await screen.findByRole('button', {
      name: 'Dates of Football, kids 7–10',
    }),
  )

const cancelDay = async (date: string) => {
  fireEvent.click(await screen.findByRole('button', { name: 'Cancel a day' }))
  fireEvent.keyDown(await screen.findByLabelText('Day to cancel'), {
    key: 'Enter',
  })
  await pickDay(date)
  const submit = screen.getByRole('button', { name: 'Cancel the session' })
  submit.focus()
  fireEvent.click(submit)
}

test('group dates: any day the group meets can be cancelled, and the chosen one is sent', async () => {
  today()
  const { calls } = withGroups({
    [`PUT ${cancellationRoute('2026-11-19')}`]: [
      200,
      { ...football, cancellations: ['2026-11-19'] },
    ],
  })
  renderApp('/schedule')

  await openDates()
  await cancelDay('2026-11-19')

  await waitFor(() =>
    expect(calls.map((c) => c.route)).toContain(
      `PUT ${cancellationRoute('2026-11-19')}`,
    ),
  )
})

test('group dates: a day the group does not meet, or has cancelled, is refused before the request', async () => {
  today()
  const { calls } = withGroups({
    [`GET ${api(groupsRoute)}`]: [
      200,
      [{ ...football, cancellations: ['2026-11-19'] }],
    ],
  })
  renderApp('/schedule')

  await openDates()
  await cancelDay('2026-11-18')
  expect(await screen.findByText(/doesn.t meet on this day/)).toBeTruthy()
  await waitFor(() =>
    expect(document.activeElement).toBe(screen.getByLabelText('Day to cancel')),
  )
  fireEvent.keyDown(screen.getByLabelText('Day to cancel'), { key: 'Enter' })
  await pickDay('2026-11-19')
  fireEvent.click(screen.getByRole('button', { name: 'Cancel the session' }))
  expect(await screen.findByText('This day is already cancelled')).toBeTruthy()
  expect(calls.some((c) => c.route.startsWith('PUT'))).toBe(false)
})

test('group dates: a cancelled day is listed and can be restored', async () => {
  today()
  const cancelled = { ...football, cancellations: ['2026-11-19'] }
  const { calls, set } = withGroups({
    [`GET ${api(groupsRoute)}`]: [200, [cancelled]],
    [`DELETE ${cancellationRoute('2026-11-19')}`]: [204],
  })
  renderApp('/schedule')

  await openDates()
  expect(await screen.findByText('Thu, Nov 19')).toBeTruthy()
  set(`GET ${api(groupsRoute)}`, [200, [football]])
  fireEvent.click(screen.getByRole('button', { name: 'Restore Thu, Nov 19' }))

  await waitFor(() =>
    expect(calls.map((c) => c.route)).toContain(
      `DELETE ${cancellationRoute('2026-11-19')}`,
    ),
  )
  await waitFor(() => expect(screen.queryByText('Thu, Nov 19')).toBeNull())
})

test('group dates: a restore the back refuses says which session sits there', async () => {
  today()
  withGroups({
    [`GET ${api(groupsRoute)}`]: [
      200,
      [{ ...football, cancellations: ['2026-11-19'] }],
    ],
    [`DELETE ${cancellationRoute('2026-11-19')}`]: [
      409,
      {
        statusCode: 409,
        error: 'Conflict',
        message: 'x',
        field: 'date',
        conflictsWith: {
          kind: 'oneOffSession',
          id: 's1',
          title: 'Open day',
          startsAt: '2026-11-19T15:00:00Z',
        },
      },
    ],
  })
  renderApp('/schedule')

  await openDates()
  fireEvent.click(
    await screen.findByRole('button', { name: 'Restore Thu, Nov 19' }),
  )

  expect(await screen.findByText(/One-off session «Open day»/)).toBeTruthy()
  expect(screen.getByText('Thu, Nov 19')).toBeTruthy()
})

const openDay = {
  id: '00000000-0000-4000-8000-000000000051',
  title: 'Open day',
  description: null,
  startsAt: '2026-11-19T08:00:00.000Z',
  endsAt: '2026-11-19T09:00:00.000Z',
  capacity: 20,
}
const ended = {
  ...openDay,
  id: '00000000-0000-4000-8000-000000000052',
  title: 'Old show',
  startsAt: '2026-11-10T08:00:00.000Z',
  endsAt: '2026-11-10T09:00:00.000Z',
}

test('one-off sessions: the coming ones are listed with day, time and seats; ended ones are not', async () => {
  today()
  withGroups({ [`GET ${api(sessionsRoute)}`]: [200, [ended, openDay]] })
  renderApp('/schedule')

  expect(await screen.findByText('Open day')).toBeTruthy()
  // Bangkok is UTC+7: 08:00Z–09:00Z is 15:00–16:00.
  expect(
    screen.getByText(/Thu, Nov 19 · 15:00–16:00 · up to 20 people/),
  ).toBeTruthy()
  expect(screen.queryByText('Old show')).toBeNull()
})

test('one-off sessions: delete asks first, then removes it', async () => {
  today()
  const { calls, set } = withGroups({
    [`GET ${api(sessionsRoute)}`]: [200, [openDay]],
    [`DELETE ${api(`${sessionsRoute}/${openDay.id}`)}`]: [204],
  })
  renderApp('/schedule')

  fireEvent.click(
    await screen.findByRole('button', { name: 'Delete Open day' }),
  )
  expect(calls.some((c) => c.route.startsWith('DELETE'))).toBe(false)
  set(`GET ${api(sessionsRoute)}`, [200, []])
  fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))

  await waitFor(() => expect(screen.queryByText('Open day')).toBeNull())
  expect(calls.some((c) => c.route.startsWith('DELETE'))).toBe(true)
})

async function fillSession() {
  fireEvent.click(
    await screen.findByRole('button', { name: '+ One-off session' }),
  )
  fireEvent.change(await screen.findByLabelText('Name'), {
    target: { value: ' Open day ' },
  })
  fireEvent.keyDown(screen.getByLabelText('Date'), { key: 'Enter' })
  await pickDay('2026-11-19')
  sendTime('Starts at', '15:00')
  sendTime('Ends at', '16:00')
  fireEvent.change(screen.getByLabelText('Seats'), { target: { value: '20' } })
}

test('one-off sessions: a new one is posted with the instants in the business zone', async () => {
  today()
  const { calls } = withGroups({
    [`POST ${api(sessionsRoute)}`]: [201, { ...openDay }],
  })
  renderApp('/schedule')

  await fillSession()
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))

  await waitFor(() =>
    expect(calls.some((c) => c.route.startsWith('POST'))).toBe(true),
  )
  expect(calls.find((c) => c.route.startsWith('POST'))?.body).toEqual({
    title: 'Open day',
    description: null,
    startsAt: '2026-11-19T08:00:00.000Z',
    endsAt: '2026-11-19T09:00:00.000Z',
    capacity: 20,
  })
})

test('one-off sessions: a 409 names the session it overlaps', async () => {
  today()
  withGroups({
    [`POST ${api(sessionsRoute)}`]: [
      409,
      {
        statusCode: 409,
        error: 'Conflict',
        message: 'x',
        field: 'startsAt',
        conflictsWith: {
          kind: 'group',
          id: football.id,
          title: football.title,
          date: '2026-11-19',
        },
      },
    ],
  })
  renderApp('/schedule')

  await fillSession()
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))

  expect(
    await screen.findByText(/Overlaps another session: Football, kids 7–10/),
  ).toBeTruthy()
})

test('one-off sessions: an empty form says what is missing and sends nothing', async () => {
  today()
  const { calls } = withGroups()
  renderApp('/schedule')

  fireEvent.click(
    await screen.findByRole('button', { name: '+ One-off session' }),
  )
  fireEvent.click(await screen.findByRole('button', { name: 'Save' }))

  expect((await screen.findAllByText('Required')).length).toBeGreaterThan(0)
  expect(calls.some((c) => c.route.startsWith('POST'))).toBe(false)
})

test('one-off sessions: a session that is already over is refused before the request', async () => {
  today()
  const { calls } = withGroups()
  renderApp('/schedule')

  fireEvent.click(
    await screen.findByRole('button', { name: '+ One-off session' }),
  )
  fireEvent.change(await screen.findByLabelText('Name'), {
    target: { value: 'Open day' },
  })
  fireEvent.keyDown(screen.getByLabelText('Date'), { key: 'Enter' })
  // Now is 19:00 in Bangkok.
  await pickDay('2026-11-17')
  sendTime('Starts at', '08:00')
  sendTime('Ends at', '09:00')
  fireEvent.change(screen.getByLabelText('Seats'), { target: { value: '5' } })
  const save = screen.getByRole('button', { name: 'Save' })
  save.focus()
  fireEvent.click(save)

  expect(await screen.findByText('This time has already passed')).toBeTruthy()
  await waitFor(() =>
    expect(document.activeElement).toBe(screen.getByLabelText('Ends at')),
  )
  expect(calls.some((c) => c.route.startsWith('POST'))).toBe(false)
})
