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
const listUrl = `GET ${base}/clients?limit=20&offset=0`
const cardUrl = (id: string) => `GET ${base}/clients/${id}`
const historyUrl = (id: string) =>
  `GET ${base}/clients/${id}/appointments?limit=20&offset=0`

const annaId = '00000000-0000-4000-8000-000000000031'
const mashaId = '00000000-0000-4000-8000-000000000032'
const newId = '00000000-0000-4000-8000-000000000033'

const anna = {
  id: annaId,
  name: 'Anna Petrova',
  phone: '+79990001122',
  guardianId: null,
  guardian: null,
  note: null,
  noShowCount: 0,
}
const masha = {
  ...anna,
  id: mashaId,
  name: 'Masha',
  phone: null,
  guardianId: annaId,
  guardian: { id: annaId, name: anna.name, phone: anna.phone },
}
const card = (client: object, dependents: unknown[] = []) => ({
  ...client,
  dependents,
  visitCount: 0,
})
const staff = (): [number, unknown] => [200, []]
const empty = (): [number, unknown] => [200, { items: [], total: 0 }]

const typeInto = (label: string, value: string) =>
  fireEvent.change(within(screen.getByRole('dialog')).getByLabelText(label), {
    target: { value },
  })
const save = () =>
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Save' }),
  )
const created = (client: object): [number, unknown] => [201, client]

test('a holder is created with a phone and the app opens their card', async () => {
  const api = fakeApi({
    'GET /api/me': [200, account],
    [`GET ${base}/staff`]: staff(),
    [listUrl]: empty(),
    [`POST ${base}/clients`]: created({ ...anna, id: newId, name: 'Olga' }),
    [cardUrl(newId)]: [200, card({ ...anna, id: newId, name: 'Olga' })],
    [historyUrl(newId)]: empty(),
  })
  renderApp('/clients')
  fireEvent.click(await screen.findByRole('button', { name: 'Add client' }))
  await screen.findByRole('dialog')
  typeInto('Name', 'Olga')
  typeInto('Phone', '+66 81 234 5678')
  typeInto('Note', ' Mornings ')
  save()

  await screen.findByRole('heading', { name: 'Olga', level: 1 })
  expect(api.calls.find((c) => c.route.startsWith('POST'))?.body).toEqual({
    name: 'Olga',
    phone: '+66812345678',
    note: 'Mornings',
  })
  expect(screen.queryByRole('dialog')).toBeNull()
})

test('a dependent is created through the combobox with the guardian id, and only holders are offered', async () => {
  const api = fakeApi({
    'GET /api/me': [200, account],
    [`GET ${base}/staff`]: staff(),
    [listUrl]: empty(),
    [`GET ${base}/clients?limit=20`]: [200, { items: [anna, masha], total: 2 }],
    [`POST ${base}/clients`]: created({ ...masha, id: newId, name: 'Pasha' }),
    [cardUrl(newId)]: [200, card({ ...masha, id: newId, name: 'Pasha' })],
    [historyUrl(newId)]: empty(),
  })
  renderApp('/clients')
  fireEvent.click(await screen.findByRole('button', { name: 'Add client' }))
  await screen.findByRole('dialog')
  typeInto('Name', 'Pasha')
  fireEvent.click(screen.getByRole('radio', { name: 'Comes with someone' }))
  expect(screen.queryByLabelText('Phone')).toBeNull()
  fireEvent.keyDown(screen.getByRole('combobox', { name: 'Comes with' }), {
    key: 'ArrowDown',
  })
  expect(
    await screen.findByRole('option', { name: 'Anna Petrova' }),
  ).toBeTruthy()
  expect(screen.queryByRole('option', { name: 'Masha' })).toBeNull()
  fireEvent.click(screen.getByRole('option', { name: 'Anna Petrova' }))
  save()

  await screen.findByRole('heading', { name: 'Pasha', level: 1 })
  expect(api.calls.find((c) => c.route.startsWith('POST'))?.body).toEqual({
    name: 'Pasha',
    guardianId: annaId,
  })
})

test("a taken phone says so and offers the holder's card", async () => {
  fakeApi({
    'GET /api/me': [200, account],
    [`GET ${base}/staff`]: staff(),
    [listUrl]: empty(),
    [`POST ${base}/clients`]: [
      409,
      { statusCode: 409, code: 'phoneTaken', clientId: annaId },
    ],
    [cardUrl(annaId)]: [200, card(anna)],
    [historyUrl(annaId)]: empty(),
  })
  renderApp('/clients')
  fireEvent.click(await screen.findByRole('button', { name: 'Add client' }))
  await screen.findByRole('dialog')
  typeInto('Name', 'Olga')
  typeInto('Phone', '+7 999 000-11-22')
  save()

  expect(
    await screen.findByText('This number is already a client'),
  ).toBeTruthy()
  const link = await screen.findByRole('link', { name: 'Open Anna Petrova' })
  fireEvent.click(link)
  await screen.findByRole('heading', { name: 'Anna Petrova', level: 1 })
  expect(screen.queryByRole('dialog')).toBeNull()
})

test('editing sends only what changed, and the card shows it after', async () => {
  let name = anna.name
  const api = fakeApi({
    'GET /api/me': [200, account],
    [`GET ${base}/staff`]: staff(),
    [cardUrl(annaId)]: () => [200, card({ ...anna, name })],
    [historyUrl(annaId)]: empty(),
    [`PATCH ${base}/clients/${annaId}`]: () => {
      name = 'Anna P.'
      return [200, { ...anna, name }]
    },
  })
  renderApp(`/clients/${annaId}`)
  fireEvent.click(await screen.findByRole('button', { name: 'Edit' }))
  await screen.findByRole('dialog')
  expect((screen.getByLabelText('Phone') as HTMLInputElement).value).toMatch(
    /999/,
  )
  typeInto('Name', 'Anna P.')
  save()

  await screen.findByRole('heading', { name: 'Anna P.', level: 1 })
  expect(api.calls.find((c) => c.route.startsWith('PATCH'))?.body).toEqual({
    name: 'Anna P.',
  })
  expect(screen.queryByRole('dialog')).toBeNull()
})

test('a dependent is edited without a phone or a guardian field', async () => {
  fakeApi({
    'GET /api/me': [200, account],
    [`GET ${base}/staff`]: staff(),
    [cardUrl(mashaId)]: [200, card(masha)],
    [historyUrl(mashaId)]: empty(),
  })
  renderApp(`/clients/${mashaId}`)
  fireEvent.click(await screen.findByRole('button', { name: 'Edit' }))
  const dialog = await screen.findByRole('dialog')
  expect(within(dialog).queryByLabelText('Phone')).toBeNull()
  expect(within(dialog).queryByRole('combobox')).toBeNull()
  expect(within(dialog).queryByRole('radio')).toBeNull()
})
