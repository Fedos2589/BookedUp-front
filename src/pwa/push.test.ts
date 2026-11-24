import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import {
  PushDeniedError,
  currentEndpoint,
  pushSupport,
  subscribe,
  unsubscribe,
} from './push'

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120'

const subscription = {
  endpoint: 'https://push.example/abc',
  toJSON: () => ({
    endpoint: 'https://push.example/abc',
    keys: { p256dh: 'p', auth: 'a' },
  }),
  unsubscribe: vi.fn(() => Promise.resolve(true)),
}

function fakeBrowser(options: {
  userAgent: string
  pushManager?: boolean
  standalone?: boolean
  permission?: NotificationPermission
  existing?: typeof subscription | null
}) {
  const pushManager = {
    subscribe: vi.fn((_options: PushSubscriptionOptionsInit) =>
      Promise.resolve(subscription),
    ),
    getSubscription: vi.fn(() => Promise.resolve(options.existing ?? null)),
  }
  vi.stubGlobal('navigator', {
    userAgent: options.userAgent,
    serviceWorker: { ready: Promise.resolve({ pushManager }) },
  })
  if (options.pushManager === false) {
    Reflect.deleteProperty(window, 'PushManager')
  } else {
    vi.stubGlobal('PushManager', class {})
  }
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === '(display-mode: standalone)' && !!options.standalone,
  }))
  const Notification = {
    permission: options.permission ?? 'default',
    requestPermission: vi.fn(() =>
      Promise.resolve(options.permission ?? 'granted'),
    ),
  }
  vi.stubGlobal('Notification', Notification)
  return { pushManager, Notification }
}

beforeEach(() => {
  subscription.unsubscribe.mockClear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

test('Android Chrome can push', () => {
  fakeBrowser({ userAgent: ANDROID })
  expect(pushSupport()).toBe('yes')
})

test('iPhone Safari outside the installed app must install first', () => {
  fakeBrowser({ userAgent: IPHONE })
  expect(pushSupport()).toBe('installFirst')
})

test('the installed iPhone app can push', () => {
  fakeBrowser({ userAgent: IPHONE, standalone: true })
  expect(pushSupport()).toBe('yes')
})

test('a browser without PushManager cannot push', () => {
  fakeBrowser({ userAgent: ANDROID, pushManager: false })
  expect(pushSupport()).toBe('no')
})

test('subscribe passes the server key as bytes and returns the subscription', async () => {
  const { pushManager } = fakeBrowser({ userAgent: ANDROID })

  const result = await subscribe('AQID') // base64url of bytes 1, 2, 3

  const [options] = pushManager.subscribe.mock.calls[0] ?? []
  const key = options?.applicationServerKey
  expect(options?.userVisibleOnly).toBe(true)
  expect(key).toBeInstanceOf(Uint8Array)
  expect(Array.from(key as Uint8Array)).toEqual([1, 2, 3])
  expect(result.endpoint).toBe('https://push.example/abc')
})

test('a denied permission throws the typed error and does not subscribe', async () => {
  const { pushManager } = fakeBrowser({
    userAgent: ANDROID,
    permission: 'denied',
  })

  await expect(subscribe('AQID')).rejects.toBeInstanceOf(PushDeniedError)
  expect(pushManager.subscribe).not.toHaveBeenCalled()
})

test('currentEndpoint is this browser’s subscription, or null', async () => {
  fakeBrowser({ userAgent: ANDROID, existing: subscription })
  expect(await currentEndpoint()).toBe('https://push.example/abc')

  fakeBrowser({ userAgent: ANDROID, existing: null })
  expect(await currentEndpoint()).toBeNull()
})

test('unsubscribe drops this browser’s subscription', async () => {
  fakeBrowser({ userAgent: ANDROID, existing: subscription })
  await unsubscribe()
  expect(subscription.unsubscribe).toHaveBeenCalledOnce()
})
