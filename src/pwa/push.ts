// Web Push from the page's side: can this browser do it, ask for permission,
// subscribe with the back's key. The worker's side is public/push-sw.js.

export class PushDeniedError extends Error {
  constructor() {
    super('Notifications are blocked in the browser settings')
    this.name = 'PushDeniedError'
  }
}

// The prompt was closed without a choice: asking again can still work.
export class PushDismissedError extends Error {
  constructor() {
    super('The notification prompt was closed')
    this.name = 'PushDismissedError'
  }
}

// 'installFirst': iOS gives push to installed web apps only.
export type PushSupport = 'yes' | 'installFirst' | 'no'

// iPadOS 13+ Safari calls itself a Mac; only a touch screen gives it away.
const isIos = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1)
const isInstalled = () =>
  window.matchMedia('(display-mode: standalone)').matches

export function pushSupport(): PushSupport {
  if (isIos() && !isInstalled()) return 'installFirst'
  const capable = 'PushManager' in window && 'serviceWorker' in navigator
  return capable ? 'yes' : 'no'
}

// The back's VAPID key arrives as base64url; the browser wants bytes.
function keyToBytes(key: string): Uint8Array<ArrayBuffer> {
  const base64 = key.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

const sameBytes = (a: Uint8Array, b: Uint8Array) =>
  a.length === b.length && a.every((byte, i) => byte === b[i])

// getRegistration, not `ready`: with no worker (dev, a failed registration)
// `ready` never settles and a sign-out waiting on it would hang.
const registration = () => navigator.serviceWorker.getRegistration()

export async function subscribe(
  pushKey: string,
): Promise<PushSubscriptionJSON> {
  const permission = await Notification.requestPermission()
  if (permission === 'denied') throw new PushDeniedError()
  if (permission !== 'granted') throw new PushDismissedError()
  const worker = await registration()
  if (!worker) throw new Error('No service worker to subscribe through')
  const key = keyToBytes(pushKey)
  // A subscription made with another key makes subscribe() throw for good.
  const existing = await worker.pushManager.getSubscription()
  const old = existing?.options?.applicationServerKey
  if (existing && !(old && sameBytes(new Uint8Array(old), key)))
    await existing.unsubscribe()
  const subscription = await worker.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: key,
  })
  return subscription.toJSON()
}

export async function currentEndpoint(): Promise<string | null> {
  const subscription = await (
    await registration()
  )?.pushManager.getSubscription()
  return subscription?.endpoint ?? null
}

export async function unsubscribe(): Promise<void> {
  const subscription = await (
    await registration()
  )?.pushManager.getSubscription()
  await subscription?.unsubscribe()
}
