// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { deferredAnswer, fakeApi as stubApi } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

beforeEach(() => {
  // Only the clock: the 14 days asked for start from "today" in the business's zone.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-23T10:00:00Z'))
})

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const HOURS_ANNA = '11111111-1111-4111-8111-111111111111'
const HOURS_BORIS = '22222222-2222-4222-8222-222222222222'
const GROUPS_CARA = '33333333-3333-4333-8333-333333333333'

const BUSINESS = 'GET /api/public/businesses/judo'
const SESSION = 'GET /api/public/client-session'
const PHONE = '+66812345678'

// The client is signed in unless a test says otherwise.
const fakeApi = (routes: Parameters<typeof stubApi>[0]) =>
  stubApi({ [SESSION]: [200, { phone: PHONE }], ...routes })
const SLOTS =
  'GET /api/public/businesses/judo/slots?from=2026-11-23&to=2026-12-06'

const business = {
  name: 'Judo Kids',
  slug: 'judo',
  timeZone: 'Europe/Berlin',
  channels: { telegram: false, whatsapp: true, push: false, email: false },
  pushKey: null,
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
      phone: PHONE,
      manageLink: 'https://x.test/manage/abc',
    },
  ] as [number, unknown]

const typeInto = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } })

// From the first step, so the history holds step 1 behind step 2.
const toContactsFromStart = async (master: RegExp) => {
  const rendered = renderApp('/book/judo')
  fireEvent.click(await screen.findByRole('button', { name: master }))
  fireEvent.click(await screen.findByRole('radio', { name: '10:00' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Continue' }))
  return rendered
}

const toContacts = async (staff: string) => {
  const rendered = renderApp(`/book/judo?staff=${staff}`)
  fireEvent.click(await screen.findByRole('radio', { name: '10:00' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Continue' }))
  return rendered
}

test('step 3: the name books the chosen master and time on the confirmed phone', async () => {
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
  expect(await screen.findByText(PHONE)).toBeTruthy()

  typeInto('Name', 'Ira')
  fireEvent.click(screen.getByRole('button', { name: 'Book' }))

  await waitFor(() =>
    expect(api.calls.find((c) => c.route === BOOK)?.body).toEqual({
      staffId: HOURS_ANNA,
      startsAt: '2026-11-24T09:00:00.000Z',
      endsAt: '2026-11-24T10:00:00.000Z',
      name: 'Ira',
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
  typeInto('Note (optional)', 'First time')
  fireEvent.click(screen.getByRole('button', { name: 'Book' }))

  await waitFor(() =>
    expect(api.calls.find((c) => c.route === BOOK)?.body).toEqual({
      startsAt: '2026-11-24T09:00:00.000Z',
      endsAt: '2026-11-24T10:00:00.000Z',
      name: 'Ira',
      note: 'First time',
    }),
  )
})

test('step 3 refuses an empty name without asking the back', async () => {
  const api = fakeApi({
    [BUSINESS]: [200, business],
    [SLOTS]: [200, [slot(HOURS_ANNA)]],
  })
  await toContacts(HOURS_ANNA)

  await screen.findByRole('heading', { name: 'Your details' })
  fireEvent.click(await screen.findByRole('button', { name: 'Book' }))

  expect(await screen.findByText('Required')).toBeTruthy()
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
  fireEvent.click(await screen.findByRole('button', { name: 'Book' }))
}

test.each(['notFree', 'full'])(
  'a %s refusal sends the client back to step 2 with a note and fresh times',
  async (code) => {
    const api: ReturnType<typeof fakeApi> = fakeApi({
      [BUSINESS]: [200, business],
      [SLOTS]: [200, [slot(HOURS_ANNA)]],
      [BOOK]: (): [number, unknown] => {
        api.set(SLOTS, [200, []])
        return [409, { statusCode: 409, error: 'Conflict', code }]
      },
    })
    await toContacts(HOURS_ANNA)
    await fillAndBook()

    expect(
      await screen.findByRole('heading', { name: 'Choose a day and a time' }),
    ).toBeTruthy()
    expect(screen.getByText(/That time was just taken/)).toBeTruthy()
    await waitFor(() =>
      expect(api.calls.filter((c) => c.route === SLOTS).length).toBe(2),
    )
    // The fresh times no longer hold it.
    await waitFor(() =>
      expect(screen.queryByRole('radio', { name: '10:00' })).toBeNull(),
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
      {
        statusCode: 400,
        error: 'Bad Request',
        message: ['name: must be shorter than or equal to 100 characters'],
      },
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

test('step 4: the booking, who, where, and the private link to copy', async () => {
  fakeApi({
    [BUSINESS]: [200, business],
    [SLOTS]: [200, [slot(HOURS_ANNA)]],
    [BOOK]: booked(HOURS_ANNA),
  })
  const writeText = vi.fn(async () => {})
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
  await toContacts(HOURS_ANNA)
  await fillAndBook()

  const heading = await screen.findByRole('heading', { name: 'You are booked' })
  expect(document.activeElement).toBe(heading)
  expect(screen.getByText(/10:00–11:00/)).toBeTruthy()
  expect(screen.getByText(/Anna/)).toBeTruthy()
  expect(screen.getByText(/Judo Kids/, { selector: 'p, span' })).toBeTruthy()
  expect(
    (screen.getByLabelText('Your booking link') as HTMLInputElement).value,
  ).toBe('https://x.test/manage/abc')
  expect(screen.getByText(/only way to cancel or move/)).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: 'Copy link' }))
  await waitFor(() =>
    expect(writeText).toHaveBeenCalledWith('https://x.test/manage/abc'),
  )
  expect(JSON.parse(localStorage.getItem('booking:judo') ?? '{}')).toEqual({
    manageLink: 'https://x.test/manage/abc',
    startsAt: '2026-11-24T09:00:00.000Z',
  })
})

test('a coming booking saved in the browser is offered on step 1', async () => {
  localStorage.setItem(
    'booking:judo',
    JSON.stringify({
      manageLink: 'https://x.test/manage/abc',
      startsAt: '2026-11-24T09:00:00.000Z',
    }),
  )
  fakeApi({
    [BUSINESS]: [200, business],
    [SLOTS]: [200, [slot(HOURS_ANNA)]],
  })
  renderApp('/book/judo')

  const link = await screen.findByRole('link', { name: /Your booking on/ })
  expect(link.getAttribute('href')).toBe('https://x.test/manage/abc')
})

test('a past saved booking is not offered', async () => {
  localStorage.setItem(
    'booking:judo',
    JSON.stringify({
      manageLink: 'https://x.test/manage/abc',
      startsAt: '2026-11-20T09:00:00.000Z',
    }),
  )
  fakeApi({
    [BUSINESS]: [200, business],
    [SLOTS]: [200, [slot(HOURS_ANNA)]],
  })
  renderApp('/book/judo')

  await screen.findByRole('button', { name: /Anna/ })
  expect(screen.queryByRole('link', { name: /Your booking on/ })).toBeNull()
})

// ---- review of #48 ----

// The times are asked again and the time on screen is no longer among them.
const refetchWithoutTimes = async (
  api: ReturnType<typeof fakeApi>,
  queryClient: { invalidateQueries: () => Promise<void> },
) => {
  api.set(SLOTS, [200, []])
  await queryClient.invalidateQueries()
  await new Promise((resolve) => setTimeout(resolve, 100))
}

test('the contacts form and what is typed survive a slots refetch that no longer lists the time', async () => {
  const api = fakeApi({
    [BUSINESS]: [200, business],
    [SLOTS]: [200, [slot(HOURS_ANNA)]],
  })
  const { queryClient } = await toContacts(HOURS_ANNA)
  await screen.findByRole('heading', { name: 'Your details' })
  typeInto('Name', 'Ira')

  await refetchWithoutTimes(api, queryClient)

  expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Ira')
  expect(screen.queryByText('Choose a day and a time')).toBeNull()
})

test('a booking made while the slots refetch still shows the link and saves it', async () => {
  const later = deferredAnswer()
  const api = fakeApi({
    [BUSINESS]: [200, business],
    [SLOTS]: [200, [slot(HOURS_ANNA)]],
    [BOOK]: later.answer,
  })
  const { queryClient } = await toContacts(HOURS_ANNA)
  await fillAndBook()
  await waitFor(() =>
    expect(api.calls.some((c) => c.route === BOOK)).toBe(true),
  )

  await refetchWithoutTimes(api, queryClient)
  later.send(booked(HOURS_ANNA))

  expect(
    await screen.findByRole('heading', { name: 'You are booked' }),
  ).toBeTruthy()
  expect(localStorage.getItem('booking:judo')).toContain('manage/abc')
})

test('Back from the done screen leaves it; the address no longer holds the time', async () => {
  fakeApi({
    [BUSINESS]: [200, business],
    [SLOTS]: [200, [slot(HOURS_ANNA)]],
    [BOOK]: booked(HOURS_ANNA),
  })
  const { router } = await toContacts(HOURS_ANNA)
  await fillAndBook()
  await screen.findByRole('heading', { name: 'You are booked' })
  expect(router.state.location.search).not.toHaveProperty('contacts')

  router.history.back()

  expect(
    await screen.findByRole('heading', { name: 'Choose a day and a time' }),
  ).toBeTruthy()
  expect(screen.queryByText('You are booked')).toBeNull()
})

test('after a refusal Back goes to step 1, not to a second step 2', async () => {
  fakeApi({
    [BUSINESS]: [200, business],
    [SLOTS]: [200, [slot(HOURS_ANNA)]],
    [BOOK]: [409, { statusCode: 409, error: 'Conflict', code: 'notFree' }],
  })
  const { router } = await toContactsFromStart(/Anna/)
  await fillAndBook()
  await screen.findByText(/That time was just taken/)

  router.history.back()

  expect(await screen.findByText('Choose a master')).toBeTruthy()
})

test('the "just taken" note does not follow the client to another master', async () => {
  fakeApi({
    [BUSINESS]: [200, business],
    [SLOTS]: [200, [slot(HOURS_ANNA), slot(HOURS_BORIS)]],
    [BOOK]: [409, { statusCode: 409, error: 'Conflict', code: 'notFree' }],
  })
  const { router } = await toContactsFromStart(/Anna/)
  await fillAndBook()
  await screen.findByText(/That time was just taken/)
  router.history.back()
  fireEvent.click(await screen.findByRole('button', { name: /Boris/ }))

  await screen.findByRole('heading', { name: 'Choose a day and a time' })
  expect(screen.queryByText(/That time was just taken/)).toBeNull()
})

test('a field the back refused is focused, and clears when the client edits it', async () => {
  fakeApi({
    [BUSINESS]: [200, business],
    [SLOTS]: [200, [slot(HOURS_ANNA)]],
    [BOOK]: [
      400,
      {
        statusCode: 400,
        error: 'Bad Request',
        message: ['name: must be shorter than or equal to 100 characters'],
      },
    ],
  })
  await toContacts(HOURS_ANNA)
  await fillAndBook()

  expect(await screen.findByText('Check this field')).toBeTruthy()
  expect(document.activeElement).toBe(screen.getByLabelText('Name'))
  typeInto('Name', 'Irina')
  await waitFor(() => expect(screen.queryByText('Check this field')).toBeNull())
})

test('a full meeting named in the address is not bookable: step 2', async () => {
  const key = [
    GROUPS_CARA,
    '2026-11-24T09:00:00.000Z',
    '2026-11-24T10:00:00.000Z',
    'g',
    '',
  ].join('|')
  fakeApi({
    [BUSINESS]: [200, business],
    [SLOTS]: [200, [slot(GROUPS_CARA, { groupId: 'g', full: true })]],
  })
  renderApp(
    `/book/judo?staff=${GROUPS_CARA}&slot=${encodeURIComponent(key)}&contacts=true`,
  )

  expect(await screen.findByText('Choose a day and a time')).toBeTruthy()
  expect(screen.queryByText('Your details')).toBeNull()
})

test('step 4: turning on WhatsApp for the new booking switches the row to «On»', async () => {
  let on = false
  const api = fakeApi({
    [BUSINESS]: [200, business],
    [SLOTS]: [200, [slot(HOURS_ANNA)]],
    [BOOK]: booked(HOURS_ANNA),
    'PUT /api/public/bookings/abc/whatsapp': () => {
      on = true
      return [204, undefined]
    },
    'GET /api/public/bookings/abc': () => [
      200,
      {
        notifications: {
          telegram: false,
          whatsapp: on,
          push: [],
          email: null,
        },
      },
    ],
  })
  await toContacts(HOURS_ANNA)
  await fillAndBook()

  // Nothing is fetched until the first switch.
  fireEvent.click(await screen.findByRole('button', { name: 'WhatsApp' }))
  expect(await screen.findByText('On')).toBeTruthy()
  expect(
    api.calls.find((c) => c.route === 'PUT /api/public/bookings/abc/whatsapp')
      ?.body,
  ).toEqual({ locale: 'en' })
})

const LOGIN = 'POST /api/public/client-login'
const LOGIN_STATUS = 'GET /api/public/client-login'
const SIGN_OUT = 'DELETE /api/public/client-session'

test('without a session the phone is confirmed in Telegram, then one tap books; the name stays', async () => {
  const api: ReturnType<typeof fakeApi> = fakeApi({
    [SESSION]: [200, { phone: null }],
    [BUSINESS]: [200, business],
    [SLOTS]: [200, [slot(HOURS_ANNA)]],
    [LOGIN]: [201, { url: 'https://t.me/bot?start=abc' }],
    [LOGIN_STATUS]: (): [number, unknown] => {
      api.set(SESSION, [200, { phone: PHONE }])
      return [200, { status: 'confirmed' }]
    },
    [BOOK]: booked(HOURS_ANNA),
  })
  await toContacts(HOURS_ANNA)
  await screen.findByRole('heading', { name: 'Your details' })
  expect(screen.queryByRole('button', { name: 'Book' })).toBeNull()
  typeInto('Name', 'Ira')

  fireEvent.click(
    await screen.findByRole('button', { name: 'Confirm phone in Telegram' }),
  )
  expect(await screen.findByText(PHONE)).toBeTruthy()
  expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Ira')

  fireEvent.click(screen.getByRole('button', { name: 'Book' }))
  await waitFor(() =>
    expect(api.calls.find((c) => c.route === BOOK)?.body).toEqual({
      staffId: HOURS_ANNA,
      startsAt: '2026-11-24T09:00:00.000Z',
      endsAt: '2026-11-24T10:00:00.000Z',
      name: 'Ira',
    }),
  )
})

test('"Not your number?" signs the client out and asks to confirm again', async () => {
  const api: ReturnType<typeof fakeApi> = fakeApi({
    [BUSINESS]: [200, business],
    [SLOTS]: [200, [slot(HOURS_ANNA)]],
    [SIGN_OUT]: (): [number, unknown] => {
      api.set(SESSION, [200, { phone: null }])
      return [204, undefined]
    },
  })
  await toContacts(HOURS_ANNA)
  await screen.findByText(PHONE)

  fireEvent.click(screen.getByRole('button', { name: 'Not your number?' }))

  expect(
    await screen.findByRole('button', { name: 'Confirm phone in Telegram' }),
  ).toBeTruthy()
  expect(screen.queryByText(PHONE)).toBeNull()
  expect(screen.queryByRole('button', { name: 'Book' })).toBeNull()
})

test('a session that ran out meanwhile asks to confirm again instead of failing', async () => {
  const api: ReturnType<typeof fakeApi> = fakeApi({
    [BUSINESS]: [200, business],
    [SLOTS]: [200, [slot(HOURS_ANNA)]],
    [LOGIN]: [201, { url: 'https://t.me/bot?start=abc' }],
    [LOGIN_STATUS]: [200, { status: 'pending' }],
    [BOOK]: (): [number, unknown] => {
      api.set(SESSION, [200, { phone: null }])
      return [401, { statusCode: 401, code: 'clientSignIn' }]
    },
  })
  await toContacts(HOURS_ANNA)
  await screen.findByText(PHONE)
  typeInto('Name', 'Ira')
  fireEvent.click(screen.getByRole('button', { name: 'Book' }))

  expect(await screen.findByText('Waiting for confirmation…')).toBeTruthy()
  expect(screen.queryByText("Couldn't book. Try again.")).toBeNull()
  expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Ira')
})

test('the done screen says which phone was booked', async () => {
  fakeApi({
    [BUSINESS]: [200, business],
    [SLOTS]: [200, [slot(HOURS_ANNA)]],
    [BOOK]: booked(HOURS_ANNA),
  })
  await toContacts(HOURS_ANNA)
  await fillAndBook()

  expect(await screen.findByText(`Booked on ${PHONE}`)).toBeTruthy()
})
