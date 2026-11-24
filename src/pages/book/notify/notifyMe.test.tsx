// @vitest-environment happy-dom
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import '@/i18n'
import {
  getPublicBookingControllerBusinessQueryOptions,
  getPublicBookingControllerManagedQueryOptions,
} from '@/api/public-booking/public-booking'
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
        pushKey={null}
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

test('Telegram: asks for the link and offers it as a link to tap', async () => {
  const api = fakeApi({
    [TELEGRAM]: [201, { url: 'https://t.me/bot?start=abc' }],
    [MANAGED]: [200, {}],
  })
  show()
  fireEvent.click(screen.getByRole('button', { name: 'Telegram' }))
  const link = await screen.findByRole('link', { name: 'Open Telegram' })
  expect(link.getAttribute('href')).toBe('https://t.me/bot?start=abc')
  expect(link.getAttribute('target')).toBe('_blank')
  expect(api.calls.find((c) => c.route === TELEGRAM)?.body).toEqual({
    locale: 'en',
  })
})

test('a turn-on asks for the booking again, so the row can switch', async () => {
  const api = fakeApi({ [`PUT ${WHATSAPP}`]: [204], [MANAGED]: [200, {}] })
  const queryClient = show()
  await queryClient.prefetchQuery(
    getPublicBookingControllerManagedQueryOptions('tok'),
  )
  api.calls.length = 0
  fireEvent.click(screen.getByRole('button', { name: /WhatsApp to/ }))
  await waitFor(() =>
    expect(api.calls.some((c) => c.route === MANAGED)).toBe(true),
  )
})

test('a failure other than 409 and channelOff is said under the block', async () => {
  fakeApi({ [`PUT ${WHATSAPP}`]: [500], [MANAGED]: [200, {}] })
  show()
  fireEvent.click(screen.getByRole('button', { name: /WhatsApp to/ }))
  expect(
    await screen.findByText("Couldn't change this. Try again."),
  ).toBeTruthy()
})

test('a 404 that is not channelOff is a failure, not a vanished channel', async () => {
  const api = fakeApi({
    [`PUT ${WHATSAPP}`]: [404, { code: 'notFound' }],
    [MANAGED]: [200, {}],
  })
  show()
  fireEvent.click(screen.getByRole('button', { name: /WhatsApp to/ }))
  expect(
    await screen.findByText("Couldn't change this. Try again."),
  ).toBeTruthy()
  expect(
    api.calls.some((c) => c.route === 'GET /api/public/businesses/judo'),
  ).toBe(false)
})

test('WhatsApp: turning on sends PUT with the locale', async () => {
  const api = fakeApi({ [`PUT ${WHATSAPP}`]: [204], [MANAGED]: [200, {}] })
  show()
  fireEvent.click(screen.getByRole('button', { name: /WhatsApp to \+7/ }))
  await waitFor(() =>
    expect(api.calls.some((c) => c.route === `PUT ${WHATSAPP}`)).toBe(true),
  )
  expect(api.calls.find((c) => c.route === `PUT ${WHATSAPP}`)?.body).toEqual({
    locale: 'en',
  })
})

// The booking is read like the parent does: the row follows its answers.
function WithBooking() {
  const booking = useQuery({
    ...getPublicBookingControllerManagedQueryOptions('tok'),
    enabled: false,
  })
  const notifications =
    (booking.data as { notifications?: typeof OFF } | undefined)
      ?.notifications ?? OFF
  return (
    <NotifyMe
      slug="judo"
      token="tok"
      channels={ALL}
      notifications={notifications}
      pushKey={null}
      phone="+7 *** ***-12-34"
    />
  )
}

test('WhatsApp: the row shows «On» after turning on and the button again after turning off', async () => {
  let on = false
  fakeApi({
    [`PUT ${WHATSAPP}`]: () => {
      on = true
      return [204]
    },
    [`DELETE ${WHATSAPP}`]: () => {
      on = false
      return [204]
    },
    [MANAGED]: () => [200, { notifications: { ...OFF, whatsapp: on } }],
  })
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <WithBooking />
    </QueryClientProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: /WhatsApp to/ }))
  fireEvent.click(await screen.findByRole('button', { name: 'Turn off' }))
  expect(
    await screen.findByRole('button', { name: /WhatsApp to/ }),
  ).toBeTruthy()
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
  expect(screen.queryByRole('button', { name: /WhatsApp to/ })).toBeNull()
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

// Push and email (the page's side of push is mocked at its module).
const push = vi.hoisted(() => ({
  pushSupport: vi.fn(() => 'yes'),
  subscribe: vi.fn(),
  currentEndpoint: vi.fn(),
  unsubscribe: vi.fn(),
  PushDeniedError: class PushDeniedError extends Error {},
  PushDismissedError: class PushDismissedError extends Error {},
}))
vi.mock('@/pwa/push', () => push)

const PUSH = '/api/public/bookings/tok/push'
const EMAIL = '/api/public/bookings/tok/email'
const SUB = { endpoint: 'https://push/me', keys: { p256dh: 'p', auth: 'a' } }
const WITH_PUSH = { ...ALL, push: true, email: true }

function showPush(over: Partial<React.ComponentProps<typeof NotifyMe>> = {}) {
  return show({
    channels: WITH_PUSH,
    pushKey: 'KEY',
    ...over,
  })
}

beforeEach(() => {
  push.pushSupport.mockReturnValue('yes')
  push.currentEndpoint.mockResolvedValue(null)
  push.subscribe.mockResolvedValue(SUB)
  push.unsubscribe.mockResolvedValue(undefined)
})

test('push: a browser that can shows the button', async () => {
  showPush()
  expect(
    await screen.findByRole('button', { name: 'Notifications on this device' }),
  ).toBeTruthy()
})

test('push: no PushManager shows nothing, an iOS tab says to install first', async () => {
  push.pushSupport.mockReturnValue('no')
  showPush()
  await screen.findByRole('button', { name: 'Email' })
  expect(screen.queryByText(/this device/)).toBeNull()
  cleanup()
  push.pushSupport.mockReturnValue('installFirst')
  showPush()
  expect(
    screen.getByText('Add this page to your home screen to get notifications'),
  ).toBeTruthy()
  expect(screen.queryByRole('button', { name: /this device/ })).toBeNull()
})

test('only push on, and it cannot show: no empty block', () => {
  const only = { telegram: false, whatsapp: false, push: true, email: false }
  showPush({ channels: only, pushKey: null })
  expect(screen.queryByText('Get a reminder')).toBeNull()
  cleanup()
  push.pushSupport.mockReturnValue('no')
  showPush({ channels: only })
  expect(screen.queryByText('Get a reminder')).toBeNull()
})

test('push: no key from the back shows no push row', () => {
  showPush({ pushKey: null })
  expect(screen.queryByText(/this device/)).toBeNull()
})

test('push: turning on subscribes with the key and sends the subscription', async () => {
  const api = fakeApi({ [`PUT ${PUSH}`]: [204], [MANAGED]: [200, {}] })
  showPush()
  fireEvent.click(
    await screen.findByRole('button', { name: 'Notifications on this device' }),
  )
  await waitFor(() =>
    expect(api.calls.some((c) => c.route === `PUT ${PUSH}`)).toBe(true),
  )
  expect(push.subscribe).toHaveBeenCalledWith('KEY')
  expect(api.calls.find((c) => c.route === `PUT ${PUSH}`)?.body).toEqual({
    subscription: SUB,
    locale: 'en',
  })
})

test("push: «On» when this device is among the booking endpoints; off deletes the booking's row and keeps the subscription", async () => {
  push.currentEndpoint.mockResolvedValue(SUB.endpoint)
  const api = fakeApi({ [`DELETE ${PUSH}`]: [204], [MANAGED]: [200, {}] })
  showPush({ notifications: { ...OFF, push: [SUB.endpoint] } })
  fireEvent.click(await screen.findByRole('button', { name: 'Turn off' }))
  await waitFor(() =>
    expect(api.calls.some((c) => c.route === `DELETE ${PUSH}`)).toBe(true),
  )
  expect(api.calls.find((c) => c.route === `DELETE ${PUSH}`)?.body).toEqual({
    endpoint: SUB.endpoint,
  })
  expect(push.unsubscribe).not.toHaveBeenCalled()
})

test('push: another device on the booking does not make this one «On»', async () => {
  push.currentEndpoint.mockResolvedValue('https://push/other-browser')
  showPush({ notifications: { ...OFF, push: [SUB.endpoint] } })
  expect(
    await screen.findByRole('button', { name: 'Notifications on this device' }),
  ).toBeTruthy()
})

test('push: a denied permission says so and leaves no request', async () => {
  push.subscribe.mockRejectedValue(new push.PushDeniedError())
  const api = fakeApi({ [`PUT ${PUSH}`]: [204], [MANAGED]: [200, {}] })
  showPush()
  fireEvent.click(
    await screen.findByRole('button', { name: 'Notifications on this device' }),
  )
  expect(
    await screen.findByText(
      'Notifications are blocked in the browser settings',
    ),
  ).toBeTruthy()
  expect(api.calls.some((c) => c.route === `PUT ${PUSH}`)).toBe(false)
})

test('email: the button opens a field, saving sends the address', async () => {
  const api = fakeApi({ [`PUT ${EMAIL}`]: [204], [MANAGED]: [200, {}] })
  showPush()
  fireEvent.click(await screen.findByRole('button', { name: 'Email' }))
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'ann@example.com' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  await waitFor(() =>
    expect(api.calls.some((c) => c.route === `PUT ${EMAIL}`)).toBe(true),
  )
  expect(api.calls.find((c) => c.route === `PUT ${EMAIL}`)?.body).toEqual({
    email: 'ann@example.com',
    locale: 'en',
  })
})

test('email: on shows the masked address and turning off sends DELETE', async () => {
  const api = fakeApi({ [`DELETE ${EMAIL}`]: [204], [MANAGED]: [200, {}] })
  showPush({ notifications: { ...OFF, email: 'a***@example.com' } })
  expect(await screen.findByText(/a\*\*\*@example\.com/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Turn off' }))
  await waitFor(() =>
    expect(api.calls.some((c) => c.route === `DELETE ${EMAIL}`)).toBe(true),
  )
})

test('email: a bad address is refused on the page, a 400 shows the field error', async () => {
  const api = fakeApi({
    [`PUT ${EMAIL}`]: [400, { message: ['email must be an email'] }],
    [MANAGED]: [200, {}],
  })
  showPush()
  fireEvent.click(await screen.findByRole('button', { name: 'Email' }))
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'nope' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(await screen.findByText('Enter a valid email')).toBeTruthy()
  expect(api.calls.some((c) => c.route === `PUT ${EMAIL}`)).toBe(false)
  fireEvent.change(screen.getByLabelText('Email'), {
    target: { value: 'ann@example.com' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  await waitFor(() =>
    expect(api.calls.some((c) => c.route === `PUT ${EMAIL}`)).toBe(true),
  )
  expect(await screen.findByText('Enter a valid email')).toBeTruthy()
})
