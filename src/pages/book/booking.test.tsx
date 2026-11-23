// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { fakeApi } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

beforeEach(() => {
  // Only the clock: the 14 days asked for start from "today" in the business's zone.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-23T10:00:00Z'))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const HOURS_ANNA = '11111111-1111-4111-8111-111111111111'
const HOURS_BORIS = '22222222-2222-4222-8222-222222222222'
const GROUPS_CARA = '33333333-3333-4333-8333-333333333333'

const BUSINESS = 'GET /api/public/businesses/judo'
const SLOTS =
  'GET /api/public/businesses/judo/slots?from=2026-11-23&to=2026-12-06'

const business = {
  name: 'Judo Kids',
  slug: 'judo',
  timeZone: 'Europe/Berlin',
  masters: [
    { id: HOURS_ANNA, name: 'Anna', scheduleMode: 'HOURS' },
    { id: HOURS_BORIS, name: 'Boris', scheduleMode: 'HOURS' },
    { id: GROUPS_CARA, name: 'Cara', scheduleMode: 'GROUPS' },
  ],
}

const slot = (staffId: string, over = {}) => ({
  staffId,
  startsAt: '2026-11-24T09:00:00.000Z',
  endsAt: '2026-11-24T10:00:00.000Z',
  title: null,
  description: null,
  capacity: 1,
  booked: 0,
  full: false,
  groupId: null,
  oneOffSessionId: null,
  ...over,
})

test('shows the business and its masters; one without free time is dimmed', async () => {
  fakeApi({
    [BUSINESS]: [200, business],
    [SLOTS]: [200, [slot(HOURS_ANNA)]],
  })
  renderApp('/book/judo')

  expect(
    await screen.findByRole('heading', { level: 1, name: 'Judo Kids' }),
  ).toBeTruthy()
  expect(
    (await screen.findByRole('button', { name: /Anna/ })).hasAttribute(
      'disabled',
    ),
  ).toBe(false)
  const boris = screen.getByRole('button', { name: /Boris/ })
  expect(boris.hasAttribute('disabled')).toBe(true)
  expect(boris.textContent).toContain('No free time in the next two weeks')
})

test('"Any free master" is offered when an hours master has a free time', async () => {
  fakeApi({
    [BUSINESS]: [200, business],
    [SLOTS]: [200, [slot(HOURS_BORIS)]],
  })
  renderApp('/book/judo')

  expect(
    await screen.findByRole('button', { name: 'Any free master' }),
  ).toBeTruthy()
})

test('"Any free master" is hidden when only a groups master has time, or an hours slot is full', async () => {
  fakeApi({
    [BUSINESS]: [200, business],
    [SLOTS]: [
      200,
      [slot(GROUPS_CARA, { groupId: 'g' }), slot(HOURS_ANNA, { full: true })],
    ],
  })
  renderApp('/book/judo')

  await screen.findByRole('button', { name: /Cara/ })
  expect(screen.queryByRole('button', { name: 'Any free master' })).toBeNull()
})

test('an unknown business is "No such page", with no way into the cabinet', async () => {
  fakeApi({ 'GET /api/public/businesses/nope': [404] })
  renderApp('/book/nope')

  expect(await screen.findByText('No such page')).toBeTruthy()
  expect(screen.queryByRole('link', { name: /sign in/i })).toBeNull()
})

test('picking a master puts it in the address', async () => {
  fakeApi({
    [BUSINESS]: [200, business],
    [SLOTS]: [200, [slot(HOURS_ANNA)]],
  })
  const { router } = renderApp('/book/judo')

  fireEvent.click(await screen.findByRole('button', { name: /Anna/ }))

  expect(router.state.location.search).toEqual({ staff: HOURS_ANNA })
})

test('step 2: the first day with time is chosen; picking a time puts day and time in the address', async () => {
  const at = '2026-11-25T09:00:00.000Z' // Wed 10:00 in Berlin
  fakeApi({
    [BUSINESS]: [200, business],
    [SLOTS]: [
      200,
      [slot(HOURS_ANNA, { startsAt: at, endsAt: '2026-11-25T10:00:00.000Z' })],
    ],
  })
  const { router } = renderApp(`/book/judo?staff=${HOURS_ANNA}`)

  expect(
    await screen.findByRole('heading', { name: 'Choose a day and a time' }),
  ).toBeTruthy()
  const time = await screen.findByRole('radio', { name: '10:00' })
  fireEvent.click(time)

  expect(router.state.location.search).toEqual({
    staff: HOURS_ANNA,
    day: '2026-11-25',
    slot: `${HOURS_ANNA}|${at}|2026-11-25T10:00:00.000Z||`,
  })
  await waitFor(() =>
    expect(
      screen.getByRole('radio', { name: '10:00' }).getAttribute('aria-checked'),
    ).toBe('true'),
  )
})

test("step 2 names the business zone when it is not the browser's", async () => {
  fakeApi({
    [BUSINESS]: [200, { ...business, timeZone: 'Pacific/Kiritimati' }],
    // 23 Nov 10:00 UTC is already the 24th there.
    'GET /api/public/businesses/judo/slots?from=2026-11-24&to=2026-12-07': [
      200,
      [],
    ],
  })
  renderApp(`/book/judo?staff=${HOURS_ANNA}`)

  expect(
    await screen.findByText('Times are in Pacific/Kiritimati'),
  ).toBeTruthy()
})

test('an address naming an unknown master shows step 1', async () => {
  fakeApi({ [BUSINESS]: [200, business], [SLOTS]: [200, []] })
  renderApp('/book/judo?staff=nobody')

  expect(await screen.findByText('Choose a master')).toBeTruthy()
})

test('a failed load is a screen with a heading and "Try again", which asks only what failed', async () => {
  const api = fakeApi({ [BUSINESS]: [503] })
  renderApp('/book/judo')

  expect(
    await screen.findByRole('heading', {
      level: 1,
      name: "Couldn't load the booking page.",
    }),
  ).toBeTruthy()
  api.set(BUSINESS, [200, business])
  api.set(SLOTS, [200, [slot(HOURS_ANNA)]])
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))

  expect(await screen.findByRole('button', { name: /Anna/ })).toBeTruthy()
  expect(api.calls.map((call) => call.route)).not.toContain(
    'GET /api/public/businesses/judo/slots?from=&to=Invalid%20Date',
  )
  expect(api.calls.every((call) => !call.route.includes('from=&'))).toBe(true)
})

test('a slots refetch that fails keeps the chosen step on screen', async () => {
  const api = fakeApi({
    [BUSINESS]: [200, business],
    [SLOTS]: [200, [slot(HOURS_ANNA)]],
  })
  const { queryClient } = renderApp(`/book/judo?staff=${HOURS_ANNA}`)
  await screen.findByRole('radio', { name: '10:00' })

  api.set(SLOTS, [503])
  await queryClient.refetchQueries({
    queryKey: ['/api/public/businesses/judo/slots'],
  })

  expect(screen.getByRole('radio', { name: '10:00' })).toBeTruthy()
})

test('choosing a day or a time replaces the history entry; choosing a master adds one', async () => {
  fakeApi({
    [BUSINESS]: [200, business],
    [SLOTS]: [200, [slot(HOURS_ANNA)]],
  })
  const { router } = renderApp('/book/judo')

  fireEvent.click(await screen.findByRole('button', { name: /Anna/ }))
  await screen.findByRole('radio', { name: '10:00' })
  const length = router.history.length
  fireEvent.click(screen.getByRole('radio', { name: '10:00' }))
  await waitFor(() => expect(router.state.location.search.slot).toBeTruthy())

  expect(router.history.length).toBe(length)
})

test('each step puts focus on its heading', async () => {
  fakeApi({
    [BUSINESS]: [200, business],
    [SLOTS]: [200, [slot(HOURS_ANNA)]],
  })
  const { router } = renderApp('/book/judo')

  const step1 = await screen.findByRole('heading', { name: 'Choose a master' })
  expect(document.activeElement).toBe(step1)
  fireEvent.click(screen.getByRole('button', { name: /Anna/ }))
  const step2 = await screen.findByRole('heading', {
    name: 'Choose a day and a time',
  })
  expect(document.activeElement).toBe(step2)
  router.history.back()
  const back = await screen.findByRole('heading', { name: 'Choose a master' })
  expect(document.activeElement).toBe(back)
})

test('?staff=any with no free hours shows step 1, as "any" is not offered', async () => {
  fakeApi({
    [BUSINESS]: [200, business],
    [SLOTS]: [200, [slot(GROUPS_CARA, { groupId: 'g' })]],
  })
  renderApp('/book/judo?staff=any')

  expect(await screen.findByText('Choose a master')).toBeTruthy()
  expect(screen.queryByText('Choose a day and a time')).toBeNull()
})

const BOOK = 'POST /api/public/businesses/judo/bookings'
const booked = (staffId: string) =>
  [
    201,
    {
      booking: {
        id: 'b1',
        staffId,
        staffName: 'Anna',
        startsAt: '2026-11-24T09:00:00.000Z',
        endsAt: '2026-11-24T10:00:00.000Z',
        title: null,
        groupId: null,
        oneOffSessionId: null,
      },
      manageLink: 'https://x.test/manage/abc',
    },
  ] as [number, unknown]

const typeInto = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } })

const toContacts = async (staff: string) => {
  const rendered = renderApp(`/book/judo?staff=${staff}`)
  fireEvent.click(await screen.findByRole('radio', { name: '10:00' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Continue' }))
  return rendered
}

test('step 3: name and phone book the chosen master and time', async () => {
  const api = fakeApi({
    [BUSINESS]: [200, business],
    [SLOTS]: [200, [slot(HOURS_ANNA)]],
    [BOOK]: booked(HOURS_ANNA),
  })
  await toContacts(HOURS_ANNA)

  const heading = await screen.findByRole('heading', { name: 'Your details' })
  expect(document.activeElement).toBe(heading)
  expect(screen.getByText(/10:00–11:00/)).toBeTruthy()
  expect(screen.getByText(/Anna/)).toBeTruthy()

  typeInto('Name', 'Ira')
  typeInto('Phone', '+66 81 234 5678')
  fireEvent.click(screen.getByRole('button', { name: 'Book' }))

  await waitFor(() =>
    expect(api.calls.find((c) => c.route === BOOK)?.body).toEqual({
      staffId: HOURS_ANNA,
      startsAt: '2026-11-24T09:00:00.000Z',
      endsAt: '2026-11-24T10:00:00.000Z',
      name: 'Ira',
      phone: '+66812345678',
    }),
  )
})

test('booking an "any master" time sends no master; a note goes along', async () => {
  const api = fakeApi({
    [BUSINESS]: [200, business],
    [SLOTS]: [200, [slot(HOURS_BORIS)]],
    [BOOK]: booked(HOURS_BORIS),
  })
  await toContacts('any')

  await screen.findByRole('heading', { name: 'Your details' })
  typeInto('Name', 'Ira')
  typeInto('Phone', '+66 81 234 5678')
  typeInto('Note (optional)', 'First time')
  fireEvent.click(screen.getByRole('button', { name: 'Book' }))

  await waitFor(() =>
    expect(api.calls.find((c) => c.route === BOOK)?.body).toEqual({
      startsAt: '2026-11-24T09:00:00.000Z',
      endsAt: '2026-11-24T10:00:00.000Z',
      name: 'Ira',
      phone: '+66812345678',
      note: 'First time',
    }),
  )
})

test('step 3 refuses an empty name and a bad phone without asking the back', async () => {
  const api = fakeApi({
    [BUSINESS]: [200, business],
    [SLOTS]: [200, [slot(HOURS_ANNA)]],
  })
  await toContacts(HOURS_ANNA)

  await screen.findByRole('heading', { name: 'Your details' })
  typeInto('Phone', '12')
  fireEvent.click(screen.getByRole('button', { name: 'Book' }))

  expect(await screen.findByText('Required')).toBeTruthy()
  expect(screen.getByText('Enter a valid phone number')).toBeTruthy()
  expect(api.calls.some((c) => c.route === BOOK)).toBe(false)
})

test('the contacts step without a chosen time is step 2', async () => {
  fakeApi({
    [BUSINESS]: [200, business],
    [SLOTS]: [200, [slot(HOURS_ANNA)]],
  })
  renderApp(`/book/judo?staff=${HOURS_ANNA}&contacts=true`)

  expect(await screen.findByText('Choose a day and a time')).toBeTruthy()
  expect(screen.queryByText('Your details')).toBeNull()
})

const fillAndBook = async () => {
  await screen.findByRole('heading', { name: 'Your details' })
  typeInto('Name', 'Ira')
  typeInto('Phone', '+66 81 234 5678')
  fireEvent.click(screen.getByRole('button', { name: 'Book' }))
}

test.each(['notFree', 'full'])(
  'a %s refusal sends the client back to step 2 with a note and fresh times',
  async (code) => {
    const api = fakeApi({
      [BUSINESS]: [200, business],
      [SLOTS]: [200, [slot(HOURS_ANNA)]],
      [BOOK]: [409, { statusCode: 409, error: 'Conflict', code }],
    })
    await toContacts(HOURS_ANNA)
    await fillAndBook()

    expect(
      await screen.findByRole('heading', { name: 'Choose a day and a time' }),
    ).toBeTruthy()
    expect(screen.getByText(/That time was just taken/)).toBeTruthy()
    expect(
      screen.getByRole('radio', { name: '10:00' }).getAttribute('aria-checked'),
    ).toBe('false')
    await waitFor(() =>
      expect(api.calls.filter((c) => c.route === SLOTS).length).toBe(2),
    )
  },
)

test('tooManyBookings is said under the button; the form stays', async () => {
  fakeApi({
    [BUSINESS]: [200, business],
    [SLOTS]: [200, [slot(HOURS_ANNA)]],
    [BOOK]: [
      409,
      { statusCode: 409, error: 'Conflict', code: 'tooManyBookings' },
    ],
  })
  await toContacts(HOURS_ANNA)
  await fillAndBook()

  expect(await screen.findByText(/3 bookings to come/)).toBeTruthy()
  expect(screen.getByLabelText('Name')).toBeTruthy()
})

test('429 asks to try later', async () => {
  fakeApi({
    [BUSINESS]: [200, business],
    [SLOTS]: [200, [slot(HOURS_ANNA)]],
    [BOOK]: [429, { statusCode: 429, message: 'Too Many Requests' }],
  })
  await toContacts(HOURS_ANNA)
  await fillAndBook()

  expect(await screen.findByText('Too many attempts, try later')).toBeTruthy()
})

test('a 400 naming a field marks that field', async () => {
  fakeApi({
    [BUSINESS]: [200, business],
    [SLOTS]: [200, [slot(HOURS_ANNA)]],
    [BOOK]: [
      400,
      { statusCode: 400, error: 'Bad Request', message: ['phone is invalid'] },
    ],
  })
  await toContacts(HOURS_ANNA)
  await fillAndBook()

  expect(await screen.findByText('Check this field')).toBeTruthy()
})

test('any other failure says it could not book', async () => {
  fakeApi({
    [BUSINESS]: [200, business],
    [SLOTS]: [200, [slot(HOURS_ANNA)]],
    [BOOK]: [500, { statusCode: 500, message: 'oops' }],
  })
  await toContacts(HOURS_ANNA)
  await fillAndBook()

  expect(await screen.findByText("Couldn't book. Try again.")).toBeTruthy()
})
