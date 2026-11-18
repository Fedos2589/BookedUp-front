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

test("last week's meeting stays on the grid and says it is over", async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-25T12:00:00Z'))
  const meeting = {
    staffId: staff[0].id,
    startsAt: '2026-11-17T11:00:00Z', // 18:00 in Bangkok
    endsAt: '2026-11-17T12:00:00Z',
    title: 'Judo',
    description: null,
    capacity: 8,
    booked: 3,
    full: false,
    groupId: '00000000-0000-4000-8000-000000000041',
    oneOffSessionId: null,
  }
  fakeApi({
    'GET /api/me': [200, account],
    [`GET /api/businesses/${businessId}/staff`]: [200, staff],
    [`GET /api/businesses/${businessId}/appointments?${query('2026-11-16', '2026-11-22', staff[0].id)}`]:
      [200, []],
    [`GET /api/businesses/${businessId}/slots?${query('2026-11-16', '2026-11-22', staff[0].id)}`]:
      [200, [meeting]],
  })
  renderApp(`/calendar?view=week&date=${day}`)

  const grid = await screen.findByRole('group', { name: 'Bookings' })
  expect(
    await within(grid).findByText(/Judo: 5 of 8 free \(ended\)/),
  ).toBeTruthy()
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

const free = {
  staffId: staff[0].id,
  startsAt: '2026-11-17T05:00:00Z', // 12:00 in Bangkok
  endsAt: '2026-11-17T06:00:00Z',
  title: null,
  description: null,
  capacity: 1,
  booked: 0,
  full: false,
  groupId: null,
  oneOffSessionId: null,
}
const listUrl = `GET /api/businesses/${businessId}/appointments?${query(day, day)}`
const slotsUrl = `GET /api/businesses/${businessId}/slots?${query(day, day)}`

// A morning in Bangkok, before the free hour (12:00 there).
const beforeFree = () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-17T01:00:00Z'))
}

async function fillNewBooking() {
  fireEvent.click(await screen.findByRole('button', { name: 'New booking' }))
  const dialog = await screen.findByRole('dialog')
  fireEvent.change(within(dialog).getByLabelText('Name'), {
    target: { value: 'Olga' },
  })
  fireEvent.change(within(dialog).getByLabelText('Phone'), {
    target: { value: '+66 81 234 5678' },
  })
  return dialog
}

test('a free hour is booked from the New booking button and shows on the grid', async () => {
  beforeFree()
  let created = false
  const api = fakeApi({
    'GET /api/me': [200, account],
    [`GET /api/businesses/${businessId}/staff`]: [200, staff],
    [listUrl]: () => [200, created ? [booking] : []],
    [slotsUrl]: [200, [free]],
    [`POST /api/businesses/${businessId}/appointments`]: () => {
      created = true
      return [201, booking]
    },
  })
  renderApp(`/calendar?date=${day}`)
  const dialog = await fillNewBooking()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Book' }))

  const grid = await screen.findByRole('group', { name: 'Bookings' })
  expect(await within(grid).findByText(/Olga/)).toBeTruthy()
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(api.calls.find((c) => c.route.startsWith('POST'))?.body).toEqual({
    staffId: staff[0].id,
    startsAt: free.startsAt,
    endsAt: free.endsAt,
    clientName: 'Olga',
    clientPhone: '+66812345678',
  })
})

test('a slot taken meanwhile says so, keeps the dialog, reloads the grid and drops the slot', async () => {
  beforeFree()
  let taken = false
  const api = fakeApi({
    'GET /api/me': [200, account],
    [`GET /api/businesses/${businessId}/staff`]: [200, staff],
    [listUrl]: [200, []],
    [slotsUrl]: () => [200, taken ? [] : [free]],
    [`POST /api/businesses/${businessId}/appointments`]: () => {
      taken = true
      return [409, { statusCode: 409, error: 'Conflict', code: 'notFree' }]
    },
  })
  renderApp(`/calendar?date=${day}`)
  const dialog = await fillNewBooking()
  const loads = () => api.calls.filter((c) => c.route === listUrl).length
  const before = loads()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Book' }))

  expect(
    await within(dialog).findByText('This time was just taken. Pick another.'),
  ).toBeTruthy()
  expect(screen.getByRole('dialog')).toBeTruthy()
  await waitFor(() => expect(loads()).toBeGreaterThan(before))
  // The taken hour is gone from the choice, so it cannot be sent again.
  await waitFor(() =>
    expect(
      (
        within(dialog).getByRole('button', {
          name: 'Book',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true),
  )
})

test('hours that have passed, or are the masters of nobody on screen, are not offered', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-17T07:00:00Z')) // after the free hour
  const archived = {
    ...staff[0],
    id: '00000000-0000-4000-8000-000000000023',
    name: 'Gone',
    archived: true,
  }
  fakeApi({
    'GET /api/me': [200, account],
    [`GET /api/businesses/${businessId}/staff`]: [200, [...staff, archived]],
    [listUrl]: [200, []],
    [slotsUrl]: [
      200,
      [
        free, // passed
        {
          ...free,
          staffId: archived.id,
          startsAt: '2026-11-17T09:00:00Z',
          endsAt: '2026-11-17T10:00:00Z',
        }, // ahead, but not a column on screen
      ],
    ],
  })
  renderApp(`/calendar?date=${day}`)

  const button = await screen.findByRole('button', { name: 'New booking' })
  expect((button as HTMLButtonElement).disabled).toBe(true)
})

const judo = {
  staffId: staff[0].id,
  startsAt: '2026-11-17T11:00:00Z', // 18:00 in Bangkok
  endsAt: '2026-11-17T12:00:00Z',
  title: 'Judo',
  description: null,
  capacity: 3,
  booked: 1,
  full: false,
  groupId: '00000000-0000-4000-8000-000000000041',
  oneOffSessionId: null,
}
const seatOf = (id: string, clientName: string) => ({
  ...booking,
  id,
  clientName,
  startsAt: judo.startsAt,
  endsAt: judo.endsAt,
  groupId: judo.groupId,
})
const meetingUrls = {
  list: `GET /api/businesses/${businessId}/appointments?${query(day, day)}`,
  slots: `GET /api/businesses/${businessId}/slots?${query(day, day)}`,
}

test('a seat is added to a group meeting and the count grows', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-17T01:00:00Z'))
  let added = false
  const api = fakeApi({
    'GET /api/me': [200, account],
    [`GET /api/businesses/${businessId}/staff`]: [200, staff],
    [meetingUrls.list]: () => [
      200,
      added
        ? [seatOf('a1', 'Anna'), seatOf('a2', 'Olga')]
        : [seatOf('a1', 'Anna')],
    ],
    [meetingUrls.slots]: () => [200, [{ ...judo, booked: added ? 2 : 1 }]],
    [`POST /api/businesses/${businessId}/appointments`]: () => {
      added = true
      return [201, seatOf('a2', 'Olga')]
    },
  })
  renderApp(`/calendar?date=${day}`)
  const grid = await screen.findByRole('group', { name: 'Bookings' })
  fireEvent.click(await within(grid).findByText(/Judo: 2 of 3 free/))

  const dialog = await screen.findByRole('dialog')
  expect(within(dialog).getByText('Free 2 of 3')).toBeTruthy()
  expect(within(dialog).getByText('Anna')).toBeTruthy()
  fireEvent.change(within(dialog).getByLabelText('Name'), {
    target: { value: 'Olga' },
  })
  fireEvent.change(within(dialog).getByLabelText('Phone'), {
    target: { value: '+66 81 234 5678' },
  })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Add' }))

  expect(await within(dialog).findByText('Free 1 of 3')).toBeTruthy()
  expect(within(dialog).getByText('Olga')).toBeTruthy()
  expect(api.calls.find((c) => c.route.startsWith('POST'))?.body).toEqual({
    staffId: staff[0].id,
    startsAt: judo.startsAt,
    endsAt: judo.endsAt,
    clientName: 'Olga',
    clientPhone: '+66812345678',
    groupId: judo.groupId,
  })
})

test('a full meeting, and one that is over, show their seats and cannot take another', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-17T01:00:00Z'))
  fakeApi({
    'GET /api/me': [200, account],
    [`GET /api/businesses/${businessId}/staff`]: [200, staff],
    [meetingUrls.list]: [200, [seatOf('a1', 'Anna')]],
    [meetingUrls.slots]: [
      200,
      [{ ...judo, capacity: 1, booked: 1, full: true }],
    ],
  })
  renderApp(`/calendar?date=${day}`)
  const grid = await screen.findByRole('group', { name: 'Bookings' })
  fireEvent.click(await within(grid).findByText(/Judo: 0 of 1 free/))

  const dialog = await screen.findByRole('dialog')
  expect(within(dialog).getByText('Anna')).toBeTruthy()
  expect(within(dialog).getByText('Every place is taken.')).toBeTruthy()
  expect(within(dialog).queryByRole('button', { name: 'Add' })).toBeNull()
})

test("last week's meeting shows its bookings and no way to add one", async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-25T12:00:00Z'))
  fakeApi({
    'GET /api/me': [200, account],
    [`GET /api/businesses/${businessId}/staff`]: [200, staff],
    [meetingUrls.list]: [200, [seatOf('a1', 'Anna')]],
    [meetingUrls.slots]: [200, [judo]],
  })
  renderApp(`/calendar?date=${day}`)
  const grid = await screen.findByRole('group', { name: 'Bookings' })
  fireEvent.click(await within(grid).findByText(/Judo: 2 of 3 free \(ended\)/))

  const dialog = await screen.findByRole('dialog')
  expect(within(dialog).getByText('Anna')).toBeTruthy()
  expect(within(dialog).getByText(/meeting is over/)).toBeTruthy()
  expect(within(dialog).queryByRole('button', { name: 'Add' })).toBeNull()
})

test('a meeting that is on takes a walk-in, even over capacity, not a seat', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-17T11:20:00Z')) // 18:20 in Bangkok
  let added = false
  const api = fakeApi({
    'GET /api/me': [200, account],
    [`GET /api/businesses/${businessId}/staff`]: [200, staff],
    [meetingUrls.list]: [200, [seatOf('a1', 'Anna')]],
    [meetingUrls.slots]: () => [
      200,
      [{ ...judo, capacity: 1, booked: added ? 2 : 1, full: true }],
    ],
    [`POST /api/businesses/${businessId}/appointments/walk-ins`]: () => {
      added = true
      return [201, { ...seatOf('a2', 'Olga'), status: 'DONE' }]
    },
  })
  renderApp(`/calendar?date=${day}`)
  const grid = await screen.findByRole('group', { name: 'Bookings' })
  fireEvent.click(await within(grid).findByText(/Judo: 0 of 1 free/))

  const dialog = await screen.findByRole('dialog')
  expect(within(dialog).queryByRole('button', { name: 'Add' })).toBeNull()
  fireEvent.change(within(dialog).getByLabelText('Name'), {
    target: { value: 'Olga' },
  })
  fireEvent.change(within(dialog).getByLabelText('Phone'), {
    target: { value: '+66 81 234 5678' },
  })
  fireEvent.click(
    within(dialog).getByRole('button', { name: 'Add someone who came' }),
  )

  expect(await within(dialog).findByText('All 1 taken, +1 over')).toBeTruthy()
  expect(api.calls.find((c) => c.route.includes('walk-ins'))?.body).toEqual({
    staffId: staff[0].id,
    startsAt: judo.startsAt,
    endsAt: judo.endsAt,
    clientName: 'Olga',
    clientPhone: '+66812345678',
    groupId: judo.groupId,
  })
})

test.each([
  ['full', 'Every place was just taken.'],
  ['notFree', 'This meeting has changed. Check the calendar and try again.'],
])(
  'a seat refused with %s says what happened, not "full"',
  async (code, text) => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-17T01:00:00Z'))
    fakeApi({
      'GET /api/me': [200, account],
      [`GET /api/businesses/${businessId}/staff`]: [200, staff],
      [meetingUrls.list]: [200, [seatOf('a1', 'Anna')]],
      [meetingUrls.slots]: [200, [judo]],
      [`POST /api/businesses/${businessId}/appointments`]: [
        409,
        { statusCode: 409, error: 'Conflict', message: code, code },
      ],
    })
    renderApp(`/calendar?date=${day}`)
    const grid = await screen.findByRole('group', { name: 'Bookings' })
    fireEvent.click(await within(grid).findByText(/Judo: 2 of 3 free/))

    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Name'), {
      target: { value: 'Olga' },
    })
    fireEvent.change(within(dialog).getByLabelText('Phone'), {
      target: { value: '+66 81 234 5678' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add' }))

    expect(await within(dialog).findByText(text)).toBeTruthy()
  },
)

const statusUrl = `PATCH /api/businesses/${businessId}/appointments/${booking.id}/status`

test('a booking is confirmed from its dialog and shows the new status', async () => {
  beforeFree()
  let status = 'BOOKED'
  const api = fakeApi({
    'GET /api/me': [200, account],
    [`GET /api/businesses/${businessId}/staff`]: [200, staff],
    [listUrl]: () => [200, [{ ...booking, status }]],
    [slotsUrl]: [200, []],
    [statusUrl]: (body) => {
      status = (body as { status: string }).status
      return [200, { ...booking, status }]
    },
  })
  renderApp(`/calendar?date=${day}`)

  const grid = await screen.findByRole('group', { name: 'Bookings' })
  fireEvent.click(await within(grid).findByText(/Olga/))
  const dialog = await screen.findByRole('dialog')
  expect(within(dialog).getByRole('status').textContent).toBe('Booked')
  // Not started: nothing to mark as done or missed yet.
  expect(
    within(dialog).queryByRole('button', { name: 'Mark as done' }),
  ).toBeNull()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }))

  await waitFor(() =>
    expect(within(dialog).getByRole('status').textContent).toBe('Confirmed'),
  )
  expect(api.calls.find((c) => c.route === statusUrl)?.body).toEqual({
    status: 'CONFIRMED',
  })
})

test('a started booking can be marked done or a no-show, and a no-show reloads the slots', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-17T03:30:00Z')) // inside its hour
  const api = fakeApi({
    'GET /api/me': [200, account],
    [`GET /api/businesses/${businessId}/staff`]: [200, staff],
    [listUrl]: [200, [booking]],
    [slotsUrl]: [200, []],
    [statusUrl]: [200, { ...booking, status: 'NO_SHOW' }],
  })
  renderApp(`/calendar?date=${day}`)

  const grid = await screen.findByRole('group', { name: 'Bookings' })
  fireEvent.click(await within(grid).findByText(/Olga/))
  const dialog = await screen.findByRole('dialog')
  expect(
    within(dialog).getByRole('button', { name: 'Mark as done' }),
  ).toBeTruthy()
  const slotLoads = () => api.calls.filter((c) => c.route === slotsUrl).length
  const before = slotLoads()
  fireEvent.click(
    within(dialog).getByRole('button', { name: 'Mark as no-show' }),
  )

  await waitFor(() => expect(slotLoads()).toBeGreaterThan(before))
})

test('a booking is cancelled after asking, also a past one, and leaves the grid', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-20T03:00:00Z')) // days after it
  let cancelled = false
  fakeApi({
    'GET /api/me': [200, account],
    [`GET /api/businesses/${businessId}/staff`]: [200, staff],
    [listUrl]: () => [200, cancelled ? [] : [booking]],
    [slotsUrl]: [200, []],
    [statusUrl]: () => {
      cancelled = true
      return [200, { ...booking, status: 'CANCELLED' }]
    },
  })
  renderApp(`/calendar?date=${day}`)

  const grid = await screen.findByRole('group', { name: 'Bookings' })
  fireEvent.click(await within(grid).findByText(/Olga/))
  const dialog = await screen.findByRole('dialog')
  fireEvent.click(
    within(dialog).getByRole('button', { name: 'Cancel booking' }),
  )
  const sure = await screen.findByRole('alertdialog')
  expect(cancelled).toBe(false)
  fireEvent.click(within(sure).getByRole('button', { name: 'Cancel booking' }))

  await waitFor(() => expect(within(grid).queryByText(/Olga/)).toBeNull())
  expect(screen.queryByRole('alertdialog')).toBeNull()
  expect(screen.queryByRole('dialog')).toBeNull()
})

test('a status change the back refuses says so and keeps the dialog', async () => {
  beforeFree()
  fakeApi({
    'GET /api/me': [200, account],
    [`GET /api/businesses/${businessId}/staff`]: [200, staff],
    [listUrl]: [200, [booking]],
    [slotsUrl]: [200, []],
    [statusUrl]: [
      409,
      { statusCode: 409, error: 'Conflict', code: 'badTransition' },
    ],
  })
  renderApp(`/calendar?date=${day}`)

  const grid = await screen.findByRole('group', { name: 'Bookings' })
  fireEvent.click(await within(grid).findByText(/Olga/))
  const dialog = await screen.findByRole('dialog')
  fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }))

  expect(
    await within(dialog).findByText(
      'This booking has changed. Here it is as it is now.',
    ),
  ).toBeTruthy()
})

const moveUrl = `PATCH /api/businesses/${businessId}/appointments/${booking.id}`
const dayFreeUrl = `GET /api/businesses/${businessId}/slots?from=${day}&to=${day}`

async function openMove() {
  const grid = await screen.findByRole('group', { name: 'Bookings' })
  fireEvent.click(await within(grid).findByText(/Olga/))
  const dialog = await screen.findByRole('dialog')
  fireEvent.click(within(dialog).getByRole('button', { name: 'Move' }))
  return screen.findByRole('dialog', { name: 'Move booking' })
}

test('a booking is moved to a free hour of the day and the grid reloads', async () => {
  beforeFree()
  let moved = false
  const api = fakeApi({
    'GET /api/me': [200, account],
    [`GET /api/businesses/${businessId}/staff`]: [200, staff],
    [listUrl]: () => [
      200,
      [
        moved
          ? { ...booking, startsAt: free.startsAt, endsAt: free.endsAt }
          : booking,
      ],
    ],
    [slotsUrl]: [200, []],
    [dayFreeUrl]: [200, [free]],
    [moveUrl]: () => {
      moved = true
      return [200, { ...booking, startsAt: free.startsAt, endsAt: free.endsAt }]
    },
  })
  renderApp(`/calendar?date=${day}`)
  const dialog = await openMove()
  await waitFor(() =>
    expect(
      (
        within(dialog).getByRole('button', {
          name: 'Move',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false),
  )
  fireEvent.click(within(dialog).getByRole('button', { name: 'Move' }))

  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(api.calls.find((c) => c.route === moveUrl)?.body).toEqual({
    staffId: staff[0].id,
    startsAt: free.startsAt,
    endsAt: free.endsAt,
  })
})

test('a time taken meanwhile says so, keeps the dialog and reloads the free hours', async () => {
  beforeFree()
  const api = fakeApi({
    'GET /api/me': [200, account],
    [`GET /api/businesses/${businessId}/staff`]: [200, staff],
    [listUrl]: [200, [booking]],
    [slotsUrl]: [200, []],
    [dayFreeUrl]: [200, [free]],
    [moveUrl]: [409, { statusCode: 409, error: 'Conflict', code: 'notFree' }],
  })
  renderApp(`/calendar?date=${day}`)
  const dialog = await openMove()
  await waitFor(() =>
    expect(
      (
        within(dialog).getByRole('button', {
          name: 'Move',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false),
  )
  const loads = () => api.calls.filter((c) => c.route === dayFreeUrl).length
  const before = loads()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Move' }))

  expect(
    await within(dialog).findByText('This time was just taken. Pick another.'),
  ).toBeTruthy()
  await waitFor(() => expect(loads()).toBeGreaterThan(before))
})

test('a finished booking has no Move', async () => {
  beforeFree()
  fakeApi({
    'GET /api/me': [200, account],
    [`GET /api/businesses/${businessId}/staff`]: [200, staff],
    [listUrl]: [200, [{ ...booking, status: 'DONE' }]],
    [slotsUrl]: [200, []],
  })
  renderApp(`/calendar?date=${day}`)
  const grid = await screen.findByRole('group', { name: 'Bookings' })
  fireEvent.click(await within(grid).findByText(/Olga/))
  const dialog = await screen.findByRole('dialog')
  expect(within(dialog).queryByRole('button', { name: 'Move' })).toBeNull()
})

const petrsHour = {
  ...free,
  staffId: petr.id,
  startsAt: '2026-11-17T02:00:00Z', // 09:00 in Bangkok, earlier than Vera's
  endsAt: '2026-11-17T03:00:00Z',
}

test("the move offers the booking's own master first, not whoever comes first", async () => {
  beforeFree()
  const api = fakeApi({
    'GET /api/me': [200, account],
    [`GET /api/businesses/${businessId}/staff`]: [200, [...staff, petr]],
    [listUrl]: [200, [booking]],
    [slotsUrl]: [200, []],
    [dayFreeUrl]: [200, [petrsHour, free]],
    [moveUrl]: [200, booking],
  })
  renderApp(`/calendar?date=${day}`)
  const dialog = await openMove()
  await waitFor(() =>
    expect(
      (
        within(dialog).getByRole('button', {
          name: 'Move',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false),
  )
  fireEvent.click(within(dialog).getByRole('button', { name: 'Move' }))

  await waitFor(() =>
    expect(api.calls.find((c) => c.route === moveUrl)?.body).toEqual({
      staffId: staff[0].id,
      startsAt: free.startsAt,
      endsAt: free.endsAt,
    }),
  )
})

test('an hour taken meanwhile is not swapped for another: Move waits for a new choice', async () => {
  beforeFree()
  let taken = false
  const api = fakeApi({
    'GET /api/me': [200, account],
    [`GET /api/businesses/${businessId}/staff`]: [200, [...staff, petr]],
    [listUrl]: [200, [booking]],
    [slotsUrl]: [200, []],
    [dayFreeUrl]: () => [200, taken ? [petrsHour] : [free, petrsHour]],
    [moveUrl]: () => {
      taken = true
      return [409, { statusCode: 409, error: 'Conflict', code: 'notFree' }]
    },
  })
  renderApp(`/calendar?date=${day}`)
  const dialog = await openMove()
  const move = () =>
    within(dialog).getByRole('button', { name: 'Move' }) as HTMLButtonElement
  await waitFor(() => expect(move().disabled).toBe(false))
  fireEvent.click(move())

  await within(dialog).findByText('This time was just taken. Pick another.')
  await waitFor(() => expect(move().disabled).toBe(true))
  expect(api.calls.filter((c) => c.route === moveUrl)).toHaveLength(1)
})

test('a cancel the back refuses says so in the question', async () => {
  beforeFree()
  fakeApi({
    'GET /api/me': [200, account],
    [`GET /api/businesses/${businessId}/staff`]: [200, staff],
    [listUrl]: [200, [booking]],
    [slotsUrl]: [200, []],
    [statusUrl]: [
      409,
      { statusCode: 409, error: 'Conflict', code: 'badTransition' },
    ],
  })
  renderApp(`/calendar?date=${day}`)
  const grid = await screen.findByRole('group', { name: 'Bookings' })
  fireEvent.click(await within(grid).findByText(/Olga/))
  const dialog = await screen.findByRole('dialog')
  fireEvent.click(
    within(dialog).getByRole('button', { name: 'Cancel booking' }),
  )
  const sure = await screen.findByRole('alertdialog')
  fireEvent.click(within(sure).getByRole('button', { name: 'Cancel booking' }))

  expect(
    await within(sure).findByText(
      'This booking has changed. Here it is as it is now.',
    ),
  ).toBeTruthy()
})

test('Back from the move keeps the chosen hour, in the same single dialog', async () => {
  beforeFree()
  fakeApi({
    'GET /api/me': [200, account],
    [`GET /api/businesses/${businessId}/staff`]: [200, [...staff, petr]],
    [listUrl]: [200, [booking]],
    [slotsUrl]: [200, []],
    [dayFreeUrl]: [200, [free, petrsHour]],
    [moveUrl]: [200, booking],
  })
  renderApp(`/calendar?date=${day}`)
  const dialog = await openMove()
  const field = () =>
    dialog.querySelector('input[aria-haspopup="listbox"]') as HTMLInputElement
  await waitFor(() => expect(field().value).toContain('Vera'))
  fireEvent.keyDown(field(), { key: 'ArrowDown' })
  fireEvent.change(field(), { target: { value: 'Petr' } })
  fireEvent.click(await screen.findByRole('option', { name: /Petr/ }))
  await waitFor(() => expect(field().value).toContain('Petr'))

  fireEvent.click(within(dialog).getByRole('button', { name: 'Back' }))
  expect(screen.getAllByRole('dialog')).toHaveLength(1)
  fireEvent.click(await screen.findByRole('button', { name: 'Move' }))
  expect(screen.getAllByRole('dialog')).toHaveLength(1)
  await waitFor(() =>
    expect(
      (
        document.querySelector(
          'input[aria-haspopup="listbox"]',
        ) as HTMLInputElement
      ).value,
    ).toContain('Petr'),
  )
})
