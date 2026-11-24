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

const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent)
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

const pushManager = async () =>
  (await navigator.serviceWorker.ready).pushManager

export async function subscribe(
  pushKey: string,
): Promise<PushSubscriptionJSON> {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new PushDeniedError()
  const subscription = await (
    await pushManager()
  ).subscribe({
    userVisibleOnly: true,
    applicationServerKey: keyToBytes(pushKey),
  })
  return subscription.toJSON()
}

export async function currentEndpoint(): Promise<string | null> {
  const subscription = await (await pushManager()).getSubscription()
  return subscription?.endpoint ?? null
}

export async function unsubscribe(): Promise<void> {
  const subscription = await (await pushManager()).getSubscription()
  await subscription?.unsubscribe()
}
