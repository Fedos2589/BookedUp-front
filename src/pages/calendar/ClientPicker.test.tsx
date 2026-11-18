// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import '@/i18n'
import { CurrentBusiness } from '@/business/currentBusiness'
import { account, fakeApi } from '@/test/fakeApi'
import type { PickerValue } from './pickerValue'
import { ClientPicker } from './ClientPicker'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const business = { ...account.businesses[0], role: 'OWNER' as const }
const clients = `GET /api/businesses/${business.id}/clients`
const annaId = '00000000-0000-4000-8000-000000000031'
const mashaId = '00000000-0000-4000-8000-000000000032'
const person = (id: string, name: string, phone: string | null) => ({
  id,
  name,
  phone,
  guardianId: phone ? null : annaId,
  guardian: phone ? null : { id: annaId, name: 'Anna', phone: '+79990001122' },
  note: null,
  noShowCount: 0,
})
const anna = person(annaId, 'Anna', '+79990001122')
const masha = person(mashaId, 'Masha', null)
const page = (...items: object[]): [number, unknown] => [
  200,
  { items, total: items.length },
]

function show() {
  const values: (PickerValue | undefined)[] = []
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <CurrentBusiness.Provider value={business}>
        <ClientPicker onChange={(value) => values.push(value)} />
      </CurrentBusiness.Provider>
    </QueryClientProvider>,
  )
  return { last: () => values[values.length - 1] }
}

const typeInto = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } })

test('a client found by search gives their id', async () => {
  fakeApi({ [`${clients}?limit=20`]: page(anna, masha) })
  const picker = show()
  expect(picker.last()).toBeUndefined()

  fireEvent.keyDown(screen.getByRole('combobox', { name: 'Client' }), {
    key: 'ArrowDown',
  })
  const option = await screen.findByRole('option', { name: /Masha/ })
  expect(option.textContent).toContain('via Anna')
  fireEvent.click(option)

  expect(picker.last()).toEqual({ clientId: mashaId })
})

test("a known phone shows the account's people and «a new person»; the new person comes with the holder", async () => {
  fakeApi({
    [`${clients}?limit=20`]: page(),
    [`${clients}?phone=%2B79990001122`]: page(anna, masha),
  })
  const picker = show()
  fireEvent.click(screen.getByRole('button', { name: 'New client' }))
  typeInto('Phone', '+7 999 000-11-22')

  expect(await screen.findByRole('radio', { name: 'Anna' })).toBeTruthy()
  expect(screen.getByRole('radio', { name: 'Masha' })).toBeTruthy()
  expect(picker.last()).toBeUndefined()

  fireEvent.click(screen.getByRole('radio', { name: 'Masha' }))
  expect(picker.last()).toEqual({ clientId: mashaId })

  fireEvent.click(
    screen.getByRole('radio', { name: 'A new person on this number' }),
  )
  expect(picker.last()).toBeUndefined()
  typeInto('Name', 'Pasha')
  expect(picker.last()).toEqual({
    newClient: { name: 'Pasha', guardianId: annaId },
  })
})

test('a phone nobody has makes a new client with that phone', async () => {
  fakeApi({
    [`${clients}?limit=20`]: page(),
    [`${clients}?phone=%2B66812345678`]: page(),
  })
  const picker = show()
  fireEvent.click(screen.getByRole('button', { name: 'New client' }))
  typeInto('Phone', '+66 81 234 5678')
  const name = await screen.findByLabelText('Name')
  fireEvent.change(name, { target: { value: 'Olga' } })

  expect(picker.last()).toEqual({
    newClient: { name: 'Olga', phone: '+66812345678' },
  })
})

test('a number that is not whole is called so once the field is left', async () => {
  fakeApi({ [`${clients}?limit=20`]: page() })
  show()
  fireEvent.click(screen.getByRole('button', { name: 'New client' }))
  const phone = screen.getByLabelText('Phone')
  fireEvent.change(phone, { target: { value: '+66 81 23' } })
  expect(screen.queryByText('Enter a valid phone number')).toBeNull()

  fireEvent.blur(phone)
  expect(await screen.findByText('Enter a valid phone number')).toBeTruthy()
})

test('a failed lookup of the phone says so and can be retried', async () => {
  let down = true
  const api = fakeApi({
    [`${clients}?limit=20`]: page(),
    [`${clients}?phone=%2B79990001122`]: () =>
      down ? [500] : page(anna, masha),
  })
  const picker = show()
  fireEvent.click(screen.getByRole('button', { name: 'New client' }))
  typeInto('Phone', '+7 999 000-11-22')

  expect(await screen.findByText("Couldn't check this number")).toBeTruthy()
  down = false
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
  expect(await screen.findByRole('radio', { name: 'Anna' })).toBeTruthy()
  expect(picker.last()).toBeUndefined()
  expect(api.calls.filter((c) => c.route.includes('phone='))).toHaveLength(2)
})

test('the search waits for the typing to pause, and asks for at most 100 characters', async () => {
  const api = fakeApi({
    [`${clients}?limit=20`]: page(),
    [`${clients}?q=Ann&limit=20`]: page(anna),
    [`${clients}?q=${'a'.repeat(100)}&limit=20`]: page(),
  })
  show()
  const field = screen.getByRole('combobox', { name: 'Client' })
  fireEvent.change(field, { target: { value: 'A' } })
  fireEvent.change(field, { target: { value: 'An' } })
  fireEvent.change(field, { target: { value: 'Ann' } })
  await waitFor(() =>
    expect(api.calls.some((c) => c.route.includes('q=Ann'))).toBe(true),
  )
  expect(api.calls.filter((c) => c.route.includes('q='))).toHaveLength(1)

  fireEvent.change(field, { target: { value: 'a'.repeat(150) } })
  await waitFor(() =>
    expect(
      api.calls.some((c) => c.route.includes(`q=${'a'.repeat(100)}&`)),
    ).toBe(true),
  )
})
