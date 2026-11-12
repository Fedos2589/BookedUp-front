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
    [`GET ${api(`/staff/${vera.id}/weekly-windows`)}`]: [200, { windows: [] }],
    [`GET ${api(`/staff/${petr.id}/weekly-windows`)}`]: [200, { windows: [] }],
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

test('a list that fails to reload keeps the page and the saved mode', async () => {
  const { set, calls } = fakeApi({
    'GET /api/me': [200, asMaster],
    [`GET ${api('/staff')}`]: [200, [vera]],
    [`GET ${api(`/staff/${vera.id}/weekly-windows`)}`]: [200, { windows: [] }],
    [`PUT ${api(`/staff/${vera.id}/schedule-mode`)}`]: () => {
      set(`GET ${api('/staff')}`, [500])
      return [200, { mode: 'GROUPS' }]
    },
  })
  renderApp('/schedule')
  fireEvent.click(await screen.findByRole('tab', { name: 'Groups' }))

  const staffGets = () =>
    calls.filter((c) => c.route === `GET ${api('/staff')}`).length
  // The first load, the reload and its 3 retries: the failure is final.
  await waitFor(() => expect(staffGets()).toBe(5), { timeout: 15000 })
  // The saved mode is shown from the PUT answer, not the failed reload.
  expect(
    screen.getByRole('tab', { name: 'Groups' }).getAttribute('aria-selected'),
  ).toBe('true')
  expect(screen.queryByText(/Couldn.t load the schedule/)).toBeNull()
})

const weeklyRoute = (id: string) => `/staff/${id}/weekly-windows`
const monday = {
  weekday: 1,
  startMinute: 540,
  durationMinutes: 480,
  slotMinutes: 30,
  title: null,
}

test('weekly hours: change a day, save, and the saved week replaces the form', async () => {
  const { calls } = fakeApi({
    'GET /api/me': [200, asMaster],
    [`GET ${api('/staff')}`]: [200, [vera]],
    [`GET ${api(weeklyRoute(vera.id))}`]: [200, { windows: [monday] }],
    [`PUT ${api(weeklyRoute(vera.id))}`]: [
      200,
      { windows: [{ ...monday, startMinute: 600, durationMinutes: 420 }] },
    ],
  })
  renderApp('/schedule')

  const from = await screen.findByLabelText('Monday: from')
  expect((from as HTMLInputElement).value).toBe('09:00')
  const save = screen.getByRole('button', { name: 'Save' })
  expect((save as HTMLButtonElement).disabled).toBe(true)

  fireEvent.change(from, { target: { value: '10:00' } })
  fireEvent.click(save)

  await waitFor(() =>
    expect(calls.find((c) => c.route.startsWith('PUT'))?.body).toEqual({
      windows: [{ ...monday, startMinute: 600, durationMinutes: 420 }],
    }),
  )
  await waitFor(() =>
    expect(
      (screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true),
  )
})

test('weekly hours: an end at 00:00 is saved as midnight, and a bad interval blocks the save', async () => {
  const { calls } = fakeApi({
    'GET /api/me': [200, asMaster],
    [`GET ${api('/staff')}`]: [200, [vera]],
    [`GET ${api(weeklyRoute(vera.id))}`]: [200, { windows: [monday] }],
    [`PUT ${api(weeklyRoute(vera.id))}`]: [200, { windows: [monday] }],
  })
  renderApp('/schedule')

  const to = await screen.findByLabelText('Monday: to')
  fireEvent.change(to, { target: { value: '09:00' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(
    await screen.findByText('The end must be after the start'),
  ).toBeTruthy()
  expect(calls.some((c) => c.route.startsWith('PUT'))).toBe(false)

  fireEvent.change(to, { target: { value: '00:00' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  await waitFor(() =>
    expect(calls.find((c) => c.route.startsWith('PUT'))?.body).toEqual({
      windows: [{ ...monday, durationMinutes: 900 }],
    }),
  )
})

const overridesRoute = (id: string) => `/staff/${id}/day-overrides`
const friday = {
  date: '2099-05-15',
  windows: [{ startMinute: 600, durationMinutes: 240, slotMinutes: 30 }],
}
const holiday = { date: '2099-05-16', windows: [] }

function withOverrides(extra: Parameters<typeof fakeApi>[0] = {}) {
  return fakeApi({
    ...extra,
    'GET /api/me': [200, asMaster],
    [`GET ${api('/staff')}`]: [200, [vera]],
    [`GET ${api(weeklyRoute(vera.id))}`]: [200, { windows: [monday] }],
    [`GET ${api(overridesRoute(vera.id))}`]: [200, [friday, holiday]],
  })
}

test('separate dates: listed with their hours or as a day off', async () => {
  withOverrides()
  renderApp('/schedule')

  expect(await screen.findByText('10:00–14:00')).toBeTruthy()
  expect(screen.getByText('Day off')).toBeTruthy()
})

test('separate dates: a changed date is saved with its windows and the list reloads', async () => {
  const { calls, set } = withOverrides()
  renderApp('/schedule')

  fireEvent.click(await screen.findByRole('button', { name: /^Change Fri/ }))
  const from = await screen.findByLabelText('Day: from')
  fireEvent.change(from, { target: { value: '11:00' } })
  set(`PUT ${api(`${overridesRoute(vera.id)}/${friday.date}`)}`, [
    200,
    {
      ...friday,
      windows: [
        { ...friday.windows[0], startMinute: 660, durationMinutes: 180 },
      ],
    },
  ])
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))

  await waitFor(() =>
    expect(
      calls.find(
        (c) =>
          c.route === `PUT ${api(`${overridesRoute(vera.id)}/${friday.date}`)}`,
      )?.body,
    ).toEqual({
      windows: [{ startMinute: 660, durationMinutes: 180, slotMinutes: 30 }],
    }),
  )
  await waitFor(() => expect(screen.queryByLabelText('Day: from')).toBeNull())
})

test('separate dates: a day off is saved without windows', async () => {
  const { calls, set } = withOverrides()
  renderApp('/schedule')

  fireEvent.click(await screen.findByRole('button', { name: /^Change Fri/ }))
  const day = await screen.findByRole('group', { name: 'Day' })
  // base-ui toggles through its hidden input.
  fireEvent.click(day.querySelector('input[type="checkbox"]')!)
  set(`PUT ${api(`${overridesRoute(vera.id)}/${friday.date}`)}`, [
    200,
    { date: friday.date, windows: [] },
  ])
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))

  await waitFor(() =>
    expect(
      calls.find(
        (c) => c.route.startsWith('PUT') && c.route.includes('day-overrides'),
      )?.body,
    ).toEqual({ windows: [] }),
  )
})

test('separate dates: delete removes the date', async () => {
  const { calls } = withOverrides({
    [`DELETE ${api(`${overridesRoute(vera.id)}/${friday.date}`)}`]: [204],
  })
  renderApp('/schedule')

  fireEvent.click(await screen.findByRole('button', { name: /^Delete Fri/ }))

  await waitFor(() =>
    expect(
      calls.some(
        (c) =>
          c.route ===
          `DELETE ${api(`${overridesRoute(vera.id)}/${friday.date}`)}`,
      ),
    ).toBe(true),
  )
})

test('weekly hours: moving the start of a night interval keeps it one, and the save goes through', async () => {
  const night = {
    ...monday,
    weekday: 5,
    startMinute: 1320,
    durationMinutes: 180,
  }
  const { calls } = fakeApi({
    'GET /api/me': [200, asMaster],
    [`GET ${api('/staff')}`]: [200, [vera]],
    [`GET ${api(weeklyRoute(vera.id))}`]: [200, { windows: [night] }],
    [`GET ${api(overridesRoute(vera.id))}`]: [200, []],
    [`PUT ${api(weeklyRoute(vera.id))}`]: [200, { windows: [night] }],
  })
  renderApp('/schedule')

  fireEvent.change(await screen.findByLabelText('Friday: from'), {
    target: { value: '00:30' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))

  await waitFor(() =>
    expect(calls.find((c) => c.route.startsWith('PUT'))?.body).toEqual({
      windows: [{ ...night, startMinute: 30, durationMinutes: 30 }],
    }),
  )
})

test('weekly hours: a failed submit moves focus to the field with the error', async () => {
  fakeApi({
    'GET /api/me': [200, asMaster],
    [`GET ${api('/staff')}`]: [200, [vera]],
    [`GET ${api(weeklyRoute(vera.id))}`]: [200, { windows: [monday] }],
    [`GET ${api(overridesRoute(vera.id))}`]: [200, []],
  })
  renderApp('/schedule')

  fireEvent.change(await screen.findByLabelText('Monday: to'), {
    target: { value: '09:00' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))

  // The first field of the interval, which both pickers are marked for.
  await waitFor(() =>
    expect(document.activeElement).toBe(screen.getByLabelText('Monday: from')),
  )
  expect(document.activeElement?.getAttribute('aria-invalid')).toBe('true')
})

test('separate dates: a refused past date is shown on the date field', async () => {
  const { set } = withOverrides()
  renderApp('/schedule')

  fireEvent.click(await screen.findByRole('button', { name: /^Change Fri/ }))
  await screen.findByLabelText('Day: from')
  set(`PUT ${api(`${overridesRoute(vera.id)}/${friday.date}`)}`, [
    400,
    { statusCode: 400, error: 'Bad Request', message: ['date: In the past'] },
  ])
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(await screen.findByText('This date is in the past')).toBeTruthy()

  // Any other refusal is the generic one.
  set(`PUT ${api(`${overridesRoute(vera.id)}/${friday.date}`)}`, [
    400,
    { statusCode: 400, error: 'Bad Request', message: ['windows: Too many'] },
  ])
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(await screen.findByText(/Couldn.t save the date/)).toBeTruthy()
  expect(screen.queryByText('This date is in the past')).toBeNull()
})

test('separate dates: a list that fails to load can be retried', async () => {
  const { set } = withOverrides()
  set(`GET ${api(overridesRoute(vera.id))}`, [500])
  renderApp('/schedule')

  expect(
    await screen.findByText(/Couldn.t load the separate dates/, undefined, {
      timeout: 15000,
    }),
  ).toBeTruthy()
  set(`GET ${api(overridesRoute(vera.id))}`, [200, [friday]])
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  expect(await screen.findByText('10:00–14:00')).toBeTruthy()
}, 20000)

test('separate dates: adding a date that is already in the list is refused, not replaced', async () => {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
  }).format(new Date())
  const { calls } = fakeApi({
    'GET /api/me': [200, asMaster],
    [`GET ${api('/staff')}`]: [200, [vera]],
    [`GET ${api(weeklyRoute(vera.id))}`]: [200, { windows: [monday] }],
    [`GET ${api(overridesRoute(vera.id))}`]: [
      200,
      [{ ...friday, date: today }],
    ],
  })
  renderApp('/schedule')

  fireEvent.click(await screen.findByRole('button', { name: '+ Date' }))
  const field = await screen.findByLabelText('Date')
  fireEvent.keyDown(field, { key: 'Enter' })
  const day = Number(today.slice(8))
  fireEvent.click(
    await screen.findByRole('button', { name: new RegExp(`^${day}\\b`) }),
  )
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))

  expect(await screen.findByText(/already in the list/)).toBeTruthy()
  expect(calls.some((c) => c.route.startsWith('PUT'))).toBe(false)
})
