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
import { getPublicBookingControllerBusinessQueryOptions } from '@/api/public-booking/public-booking'
import { fakeApi } from '@/test/fakeApi'
import { NotifyMe } from './NotifyMe'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const ALL = { telegram: true, whatsapp: true, push: false, email: false }
const OFF = { telegram: false, whatsapp: false, push: [], email: null }
const TELEGRAM = 'POST /api/public/bookings/tok/telegram-link'
const WHATSAPP = '/api/public/bookings/tok/whatsapp'
const MANAGED = 'GET /api/public/bookings/tok'

function show(over: Partial<React.ComponentProps<typeof NotifyMe>> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <NotifyMe
        slug="judo"
        token="tok"
        channels={ALL}
        notifications={OFF}
        phone="+7 *** ***-12-34"
        {...over}
      />
    </QueryClientProvider>,
  )
  return queryClient
}

test('shows a row only for the channels the business has on', () => {
  show({ channels: { ...ALL, whatsapp: false } })
  expect(screen.getByRole('button', { name: 'Telegram' })).toBeTruthy()
  expect(screen.queryByText(/WhatsApp/)).toBeNull()
})

test('Telegram: asks for the link and opens it in a new tab', async () => {
  const api = fakeApi({
    [TELEGRAM]: [201, { url: 'https://t.me/bot?start=abc' }],
    [MANAGED]: [200, {}],
  })
  const open = vi.fn()
  vi.stubGlobal('open', open)
  show()
  fireEvent.click(screen.getByRole('button', { name: 'Telegram' }))
  await waitFor(() =>
    expect(open).toHaveBeenCalledWith(
      'https://t.me/bot?start=abc',
      '_blank',
      'noopener',
    ),
  )
  expect(api.calls.find((c) => c.route === TELEGRAM)?.body).toEqual({
    locale: 'en',
  })
})

test('WhatsApp: turns on, shows «On», turns off', async () => {
  const api = fakeApi({
    [`PUT ${WHATSAPP}`]: [204],
    [`DELETE ${WHATSAPP}`]: [204],
    [MANAGED]: [200, {}],
  })
  show()
  fireEvent.click(screen.getByRole('button', { name: /WhatsApp to \+7/ }))
  await waitFor(() =>
    expect(api.calls.some((c) => c.route === `PUT ${WHATSAPP}`)).toBe(true),
  )
  expect(api.calls.find((c) => c.route === `PUT ${WHATSAPP}`)?.body).toEqual({
    locale: 'en',
  })
})

test('on: shows «On» and turning off sends DELETE', async () => {
  const api = fakeApi({
    [`DELETE ${WHATSAPP}`]: [204],
    [MANAGED]: [200, {}],
  })
  show({ notifications: { ...OFF, whatsapp: true } })
  expect(screen.getByText('On')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Turn off' }))
  await waitFor(() =>
    expect(api.calls.some((c) => c.route === `DELETE ${WHATSAPP}`)).toBe(true),
  )
})

test('409 says the booking can not change any more', async () => {
  fakeApi({
    [`PUT ${WHATSAPP}`]: [409, { code: 'locked' }],
    [MANAGED]: [200, {}],
  })
  show()
  fireEvent.click(screen.getByRole('button', { name: /WhatsApp to/ }))
  expect(
    await screen.findByText("This booking can't change any more."),
  ).toBeTruthy()
})

test('404 channelOff asks for the business again, so its channels are fresh', async () => {
  const api = fakeApi({
    [`PUT ${WHATSAPP}`]: [404, { code: 'channelOff' }],
    [MANAGED]: [200, {}],
    'GET /api/public/businesses/judo': [200, {}],
  })
  const queryClient = show()
  await queryClient.prefetchQuery(
    getPublicBookingControllerBusinessQueryOptions('judo'),
  )
  api.calls.length = 0
  fireEvent.click(screen.getByRole('button', { name: /WhatsApp to/ }))
  await waitFor(() =>
    expect(
      api.calls.some((c) => c.route === 'GET /api/public/businesses/judo'),
    ).toBe(true),
  )
})

test('Telegram connected shows «On» and no way to turn it off', () => {
  show({ notifications: { ...OFF, telegram: true } })
  expect(screen.getByText('On')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Turn off' })).toBeNull()
})
