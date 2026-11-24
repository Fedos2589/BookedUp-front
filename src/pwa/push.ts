// Web Push from the page's side: can this browser do it, ask for permission,
// subscribe with the back's key. The worker's side is public/push-sw.js.

export class PushDeniedError extends Error {
  constructor() {
    super('Notifications are blocked in the browser settings')
    this.name = 'PushDeniedError'
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

// getRegistration, not `ready`: with no worker (dev, a failed registration)
// `ready` never settles and a sign-out waiting on it would hang.
const registration = () => navigator.serviceWorker.getRegistration()

export async function subscribe(
  pushKey: string,
): Promise<PushSubscriptionJSON> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new PushDeniedError()
  const worker = await registration()
  if (!worker) throw new Error('No service worker to subscribe through')
  const subscription = await worker.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: keyToBytes(pushKey),
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
