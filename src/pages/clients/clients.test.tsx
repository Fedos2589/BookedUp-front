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
const clientsUrl = (query: string) =>
  `GET /api/businesses/${businessId}/clients?${query}`

const anna = {
  id: '00000000-0000-4000-8000-000000000031',
  name: 'Anna Petrova',
  phone: '+79990001122',
  guardianId: null,
  guardian: null,
  note: null,
  noShowCount: 2,
}
const masha = {
  id: '00000000-0000-4000-8000-000000000032',
  name: 'Masha',
  phone: null,
  guardianId: anna.id,
  guardian: { id: anna.id, name: 'Anna Petrova', phone: anna.phone },
  note: null,
  noShowCount: 0,
}
const extra = (n: number) => ({
  ...anna,
  id: `00000000-0000-4000-8000-0000000001${String(n).padStart(2, '0')}`,
  name: `Client ${n}`,
  phone: `+7999000${String(1000 + n)}`,
  noShowCount: 0,
})

const me = (): [number, unknown] => [200, account]

test('the list shows a phone, or «via» the guardian, and no-shows only when there are some', async () => {
  fakeApi({
    'GET /api/me': me(),
    [clientsUrl('limit=20&offset=0')]: [
      200,
      { items: [anna, masha], total: 2 },
    ],
  })
  renderApp('/clients')

  const list = await screen.findByRole('list', { name: 'Clients' })
  const rows = list.querySelectorAll(':scope > li')
  expect(rows[0].textContent).toMatch(
    /Anna Petrova.*\+79990001122.*No-shows: 2/,
  )
  expect(rows[1].textContent).toMatch(/Masha.*via Anna Petrova/)
  expect(rows[1].textContent).not.toMatch(/No-shows/)
  expect(
    within(rows[0] as HTMLElement)
      .getByRole('link', { name: /Anna Petrova/ })
      .getAttribute('href'),
  ).toBe(`/clients/${anna.id}`)
})

test('the navigation links to the clients', async () => {
  fakeApi({
    'GET /api/me': me(),
    [clientsUrl('limit=20&offset=0')]: [200, { items: [anna], total: 1 }],
    'GET /api/businesses/00000000-0000-4000-8000-000000000002/staff': [200, []],
  })
  const { router } = renderApp('/')
  await screen.findByRole('heading', { name: 'Judo Kids' })

  fireEvent.click(screen.getByRole('link', { name: 'Clients' }))

  await screen.findByRole('list', { name: 'Clients' })
  expect(router.state.location.pathname).toBe('/clients')
})

test('typing in the search asks the back for that text, and the address keeps it', async () => {
  const fake = fakeApi({
    'GET /api/me': me(),
    [clientsUrl('limit=20&offset=0')]: [
      200,
      { items: [anna, masha], total: 2 },
    ],
    [clientsUrl('q=mas&limit=20&offset=0')]: [
      200,
      { items: [masha], total: 1 },
    ],
  })
  const { router } = renderApp('/clients')
  await screen.findByRole('list', { name: 'Clients' })

  fireEvent.change(screen.getByRole('searchbox', { name: 'Search clients' }), {
    target: { value: 'mas' },
  })

  await waitFor(() => expect(screen.queryByText('Anna Petrova')).toBeNull())
  await screen.findByText('Masha')
  expect(router.state.location.search).toEqual({ q: 'mas' })
  // One request for the whole word, not one per key.
  expect(fake.calls.filter((call) => call.route.includes('q='))).toHaveLength(1)
})

test('the search in the address is applied on open', async () => {
  fakeApi({
    'GET /api/me': me(),
    [clientsUrl('q=mas&limit=20&offset=0')]: [
      200,
      { items: [masha], total: 1 },
    ],
  })
  renderApp('/clients?q=mas')

  await screen.findByText('Masha')
  expect(
    (
      screen.getByRole('searchbox', {
        name: 'Search clients',
      }) as HTMLInputElement
    ).value,
  ).toBe('mas')
})

test('«Show more» adds the next page until all are shown', async () => {
  const first = Array.from({ length: 20 }, (_, i) => extra(i))
  const second = [extra(20)]
  fakeApi({
    'GET /api/me': me(),
    [clientsUrl('limit=20&offset=0')]: [200, { items: first, total: 21 }],
    [clientsUrl('limit=20&offset=20')]: [200, { items: second, total: 21 }],
  })
  renderApp('/clients')
  await screen.findByText('Client 0')

  fireEvent.click(screen.getByRole('button', { name: 'Show more' }))

  await screen.findByText('Client 20')
  const list = screen.getByRole('list', { name: 'Clients' })
  expect(list.querySelectorAll(':scope > li')).toHaveLength(21)
  expect(screen.queryByRole('button', { name: 'Show more' })).toBeNull()
})

test('a business with no clients says so, and the add button waits for the dialog', async () => {
  fakeApi({
    'GET /api/me': me(),
    [clientsUrl('limit=20&offset=0')]: [200, { items: [], total: 0 }],
  })
  renderApp('/clients')

  await screen.findByRole('heading', { name: 'No clients yet' })
  expect(
    (screen.getByRole('button', { name: 'Add client' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true)
})

test('a search with no matches says that, not «no clients yet»', async () => {
  fakeApi({
    'GET /api/me': me(),
    [clientsUrl('q=zzz&limit=20&offset=0')]: [200, { items: [], total: 0 }],
  })
  renderApp('/clients?q=zzz')

  await screen.findByRole('heading', { name: 'Nobody found' })
  expect(screen.queryByRole('heading', { name: 'No clients yet' })).toBeNull()
})

test('when the list fails to load, it offers to try again', async () => {
  const fake = fakeApi({
    'GET /api/me': me(),
    [clientsUrl('limit=20&offset=0')]: [502],
  })
  renderApp('/clients')

  const retry = await screen.findByRole('button', { name: 'Try again' })
  fake.set(clientsUrl('limit=20&offset=0'), [200, { items: [anna], total: 1 }])
  fireEvent.click(retry)

  await screen.findByText('Anna Petrova')
})
