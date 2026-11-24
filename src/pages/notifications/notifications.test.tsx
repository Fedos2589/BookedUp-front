// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { account, fakeApi } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

// The page's side of push is mocked at its module.
const push = vi.hoisted(() => ({
  pushSupport: vi.fn(() => 'yes'),
  subscribe: vi.fn(),
  currentEndpoint: vi.fn(),
  unsubscribe: vi.fn(),
  PushDeniedError: class PushDeniedError extends Error {},
  PushDismissedError: class PushDismissedError extends Error {},
}))
vi.mock('@/pwa/push', () => push)

const SUB = { endpoint: 'https://push/me', keys: { p256dh: 'p', auth: 'a' } }
const ME = 'GET /api/me/notifications'
const BUSINESS = `GET /api/businesses/${account.businesses[0].id}/me/notifications`
const ALL_ONLINE = `PUT /api/businesses/${account.businesses[0].id}/me/notifications`

const mine = {
  email: true,
  available: { telegram: true, push: true, email: true },
  pushKey: 'KEY',
  telegram: false,
  push: [],
}

beforeEach(() => {
  push.pushSupport.mockReturnValue('yes')
  push.currentEndpoint.mockResolvedValue(null)
  push.subscribe.mockResolvedValue(SUB)
})

function page(
  over: Record<string, unknown> = {},
  allOnline: boolean | null = false,
) {
  return fakeApi({
    'GET /api/me': [200, account],
    [ME]: [200, { ...mine, ...over }],
    [BUSINESS]: [200, { allOnline }],
  })
}

const asMaster = {
  ...account,
  businesses: [{ ...account.businesses[0], role: 'MASTER' }],
}

test('every role has the page, and WhatsApp is not on it', async () => {
  fakeApi({
    'GET /api/me': [200, asMaster],
    [ME]: [200, mine],
    [BUSINESS]: [200, { allOnline: null }],
  })
  renderApp('/notifications')

  expect(
    await screen.findByRole('heading', { name: 'Notifications' }),
  ).toBeTruthy()
  expect(screen.queryByText(/WhatsApp/)).toBeNull()
  // A master has no «all online» (the back answers null): not shown.
  expect(screen.queryByRole('checkbox', { name: /All online/ })).toBeNull()
})

test('a channel the back does not have on is not shown', async () => {
  page({ available: { telegram: false, push: false, email: false } })
  renderApp('/notifications')
  await screen.findByRole('heading', { name: 'Notifications' })

  expect(screen.queryByRole('checkbox', { name: 'Email' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Telegram' })).toBeNull()
  expect(screen.queryByText('Notifications on this device')).toBeNull()
})

test('unchecking email sends { email: false }', async () => {
  const api = page()
  api.set('PUT /api/me/notifications', [200, { ...mine, email: false }])
  renderApp('/notifications')

  fireEvent.click(await screen.findByRole('checkbox', { name: 'Email' }))

  await waitFor(() =>
    expect(
      api.calls.find((c) => c.route === 'PUT /api/me/notifications')?.body,
    ).toEqual({ email: false }),
  )
})

test('Telegram: connect gives the link to tap', async () => {
  const api = page()
  api.set('POST /api/me/telegram-link', [
    201,
    { url: 'https://t.me/bot?start=abc' },
  ])
  renderApp('/notifications')

  fireEvent.click(await screen.findByRole('button', { name: 'Telegram' }))

  const link = await screen.findByRole('link', { name: 'Open Telegram' })
  expect(link.getAttribute('href')).toBe('https://t.me/bot?start=abc')
  expect(link.getAttribute('target')).toBe('_blank')
})

test('Telegram connected can be disconnected', async () => {
  const api = page({ telegram: true })
  api.set('DELETE /api/me/notifications/telegram', [204])
  renderApp('/notifications')

  fireEvent.click(await screen.findByRole('button', { name: 'Turn off' }))

  await waitFor(() =>
    expect(
      api.calls.some(
        (c) => c.route === 'DELETE /api/me/notifications/telegram',
      ),
    ).toBe(true),
  )
})

test('push: this device vs another one', async () => {
  push.currentEndpoint.mockResolvedValue(SUB.endpoint)
  page({ push: ['https://push/other'] })
  renderApp('/notifications')

  // Another device has it, this one does not: the button, and a note.
  expect(
    await screen.findByRole('button', { name: 'Notifications on this device' }),
  ).toBeTruthy()
  expect(screen.getByText('Also on 1 other device')).toBeTruthy()
})

test('push: this device is on', async () => {
  push.currentEndpoint.mockResolvedValue(SUB.endpoint)
  page({ push: [SUB.endpoint, 'https://push/other', 'https://push/third'] })
  renderApp('/notifications')

  expect(await screen.findByText('On')).toBeTruthy()
  expect(screen.getByText('Also on 2 other devices')).toBeTruthy()
})

test('push: turning on subscribes with the cabinet key and sends it', async () => {
  const api = page()
  api.set('PUT /api/me/notifications/push', [204])
  renderApp('/notifications')

  fireEvent.click(
    await screen.findByRole('button', { name: 'Notifications on this device' }),
  )

  await waitFor(() =>
    expect(
      api.calls.find((c) => c.route === 'PUT /api/me/notifications/push')?.body,
    ).toEqual({ subscription: SUB }),
  )
  expect(push.subscribe).toHaveBeenCalledWith('KEY')
})

test('owner and admin: «All online bookings» saves at once', async () => {
  const api = page({}, false)
  api.set(ALL_ONLINE, [200, { allOnline: true }])
  renderApp('/notifications')

  fireEvent.click(
    await screen.findByRole('checkbox', { name: /All online bookings/ }),
  )

  await waitFor(() =>
    expect(api.calls.find((c) => c.route === ALL_ONLINE)?.body).toEqual({
      allOnline: true,
    }),
  )
})

test('push: a failed turn-off says so, and the next try clears it', async () => {
  push.currentEndpoint.mockResolvedValue(SUB.endpoint)
  const api = page({ push: [SUB.endpoint] })
  api.set('DELETE /api/me/notifications/push', [500])
  renderApp('/notifications')

  fireEvent.click(await screen.findByRole('button', { name: 'Turn off' }))
  expect(
    await screen.findByText("Couldn't change this. Try again."),
  ).toBeTruthy()

  api.set('DELETE /api/me/notifications/push', [204])
  fireEvent.click(screen.getByRole('button', { name: 'Turn off' }))
  await waitFor(() =>
    expect(screen.queryByText("Couldn't change this. Try again.")).toBeNull(),
  )
})

test('push: on iOS outside the installed app, the note replaces the button', async () => {
  push.pushSupport.mockReturnValue('installFirst')
  page()
  renderApp('/notifications')

  expect(
    await screen.findByText(
      'Add this page to your home screen to get notifications',
    ),
  ).toBeTruthy()
  expect(
    screen.queryByRole('button', { name: 'Notifications on this device' }),
  ).toBeNull()
})

test('push: a blocked permission says so in the row', async () => {
  push.subscribe.mockRejectedValue(new push.PushDeniedError())
  page()
  renderApp('/notifications')

  fireEvent.click(
    await screen.findByRole('button', { name: 'Notifications on this device' }),
  )
  expect(
    await screen.findByText(
      'Notifications are blocked in the browser settings',
    ),
  ).toBeTruthy()
})

test('Telegram: a failed link request says so', async () => {
  const api = page()
  api.set('POST /api/me/telegram-link', [500])
  renderApp('/notifications')

  fireEvent.click(await screen.findByRole('button', { name: 'Telegram' }))
  expect(
    await screen.findByText("Couldn't change this. Try again."),
  ).toBeTruthy()
})

test('Telegram: disconnecting does not bring the old link back', async () => {
  const api = page()
  api.set('POST /api/me/telegram-link', [
    201,
    { url: 'https://t.me/bot?start=old' },
  ])
  api.set('DELETE /api/me/notifications/telegram', [204])
  renderApp('/notifications')
  fireEvent.click(await screen.findByRole('button', { name: 'Telegram' }))
  await screen.findByRole('link', { name: 'Open Telegram' })

  // Back from the bot the page refetches: it is connected now.
  api.set(ME, [200, { ...mine, telegram: true }])
  window.dispatchEvent(new Event('visibilitychange'))
  fireEvent.click(await screen.findByRole('button', { name: 'Turn off' }))
  api.set(ME, [200, mine])

  await screen.findByRole('button', { name: 'Telegram' })
  expect(screen.queryByRole('link', { name: 'Open Telegram' })).toBeNull()
})

test('the page says when its data could not load', async () => {
  fakeApi({ 'GET /api/me': [200, account], [ME]: [404], [BUSINESS]: [404] })
  renderApp('/notifications')

  await waitFor(() =>
    expect(
      screen.getAllByText("Couldn't load your notification settings"),
    ).toHaveLength(2),
  )
})

test('«All online bookings»: a failed save says so', async () => {
  const api = page({}, false)
  api.set(ALL_ONLINE, [500])
  renderApp('/notifications')

  fireEvent.click(
    await screen.findByRole('checkbox', { name: /All online bookings/ }),
  )
  expect(
    await screen.findByText("Couldn't change this. Try again."),
  ).toBeTruthy()
})
