// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { account, fakeApi } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const businessId = account.businesses[0].id
const base = `/api/businesses/${businessId}`
const cardUrl = (id: string) => `GET ${base}/clients/${id}`
const historyUrl = (id: string, query: string) =>
  `GET ${base}/clients/${id}/appointments?${query}`

const annaId = '00000000-0000-4000-8000-000000000031'
const mashaId = '00000000-0000-4000-8000-000000000032'
const staffId = '00000000-0000-4000-8000-000000000041'

const anna = {
  id: annaId,
  name: 'Anna Petrova',
  phone: '+79990001122',
  guardianId: null,
  guardian: null,
  note: 'Prefers mornings',
  noShowCount: 2,
  dependents: [{ id: mashaId, name: 'Masha' }],
  visitCount: 5,
}
const masha = {
  id: mashaId,
  name: 'Masha',
  phone: null,
  guardianId: annaId,
  guardian: { id: annaId, name: 'Anna Petrova', phone: anna.phone },
  note: null,
  noShowCount: 0,
  dependents: [],
  visitCount: 0,
}
const booking = (n: number, status = 'DONE') => ({
  id: `00000000-0000-4000-8000-0000000002${String(n).padStart(2, '0')}`,
  staffId,
  clientId: annaId,
  // 03:30 UTC is 10:30 in Asia/Bangkok.
  startsAt: `2026-11-1${n}T03:30:00.000Z`,
  endsAt: `2026-11-1${n}T04:30:00.000Z`,
  status,
  clientName: 'Anna Petrova',
  clientPhone: anna.phone,
  note: null,
  groupId: null,
  oneOffSessionId: null,
})

const me = (): [number, unknown] => [200, account]
const staff = (): [number, unknown] => [
  200,
  [
    {
      id: staffId,
      name: 'Olga',
      userId: null,
      archived: false,
      scheduleMode: 'SLOTS',
    },
  ],
]

test("a holder's card shows phone, counters, note, dependents and the history in the business's time zone", async () => {
  fakeApi({
    'GET /api/me': me(),
    [`GET ${base}/staff`]: staff(),
    [cardUrl(annaId)]: [200, anna],
    [historyUrl(annaId, 'limit=20&offset=0')]: [
      200,
      { items: [booking(5), booking(4, 'NO_SHOW')], total: 2 },
    ],
  })
  renderApp(`/clients/${annaId}`)

  await screen.findByRole('heading', { name: 'Anna Petrova', level: 1 })
  expect(screen.getByText('+79990001122')).toBeTruthy()
  expect(screen.getByText('Visits: 5')).toBeTruthy()
  expect(screen.getByText('No-shows: 2')).toBeTruthy()
  expect(screen.getByText('Prefers mornings')).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Masha' }).getAttribute('href')).toBe(
    `/clients/${mashaId}`,
  )

  const history = await screen.findByRole('list', { name: 'History' })
  const rows = history.querySelectorAll(':scope > li')
  expect(rows).toHaveLength(2)
  expect(rows[0].textContent).toMatch(/Nov 15.*10:30.*Olga.*Done/)
  expect(rows[1].textContent).toMatch(/Nov 14.*10:30.*Olga.*No-show/)
})

test("a dependent's card links to the guardian instead of a phone", async () => {
  fakeApi({
    'GET /api/me': me(),
    [`GET ${base}/staff`]: staff(),
    [cardUrl(mashaId)]: [200, masha],
    [historyUrl(mashaId, 'limit=20&offset=0')]: [200, { items: [], total: 0 }],
  })
  renderApp(`/clients/${mashaId}`)

  await screen.findByRole('heading', { name: 'Masha', level: 1 })
  const link = screen.getByRole('link', { name: 'Anna Petrova' })
  expect(link.getAttribute('href')).toBe(`/clients/${annaId}`)
  expect(link.parentElement?.textContent).toMatch(/via Anna Petrova/)
  expect(screen.queryByText(/No-shows/)).toBeTruthy() // the counter row stays, at 0
  expect(await screen.findByText('No bookings yet')).toBeTruthy()
})

test('«Show more» adds the next page of the history', async () => {
  const first = Array.from({ length: 20 }, (_, i) => ({
    ...booking(5),
    id: `00000000-0000-4000-8000-0000000003${String(i).padStart(2, '0')}`,
  }))
  fakeApi({
    'GET /api/me': me(),
    [`GET ${base}/staff`]: staff(),
    [cardUrl(annaId)]: [200, anna],
    [historyUrl(annaId, 'limit=20&offset=0')]: [
      200,
      { items: first, total: 21 },
    ],
    [historyUrl(annaId, 'limit=20&offset=20')]: [
      200,
      { items: [booking(1, 'CANCELLED')], total: 21 },
    ],
  })
  renderApp(`/clients/${annaId}`)

  const history = await screen.findByRole('list', { name: 'History' })
  expect(history.querySelectorAll(':scope > li')).toHaveLength(20)

  fireEvent.click(screen.getByRole('button', { name: 'Show more' }))

  await within(history).findByText(/Cancelled/)
  expect(history.querySelectorAll(':scope > li')).toHaveLength(21)
  expect(screen.queryByRole('button', { name: 'Show more' })).toBeNull()
})

test('an unknown client says so and links to the list', async () => {
  fakeApi({
    'GET /api/me': me(),
    [cardUrl(annaId)]: [404, { statusCode: 404, message: 'Not found' }],
  })
  renderApp(`/clients/${annaId}`)

  await screen.findByText('No such client')
  expect(
    screen.getByRole('link', { name: 'All clients' }).getAttribute('href'),
  ).toBe('/clients')
})
