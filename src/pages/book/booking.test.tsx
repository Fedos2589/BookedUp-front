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
  renderApp('/book/judo?staff=any')

  expect(
    await screen.findByText('Times are in Pacific/Kiritimati'),
  ).toBeTruthy()
})

test('an address naming an unknown master shows step 1', async () => {
  fakeApi({ [BUSINESS]: [200, business], [SLOTS]: [200, []] })
  renderApp('/book/judo?staff=nobody')

  expect(await screen.findByText('Choose a master')).toBeTruthy()
})
