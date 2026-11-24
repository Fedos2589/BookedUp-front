import { myNotificationsControllerPushOff } from '@/api/notifications/notifications'
import { currentEndpoint } from '@/pwa/push'

// A request that hangs must not hold a sign-out.
const TIMEOUT_MS = 3000

// This device stops getting the leaving account's pushes: on a shared
// computer the next person would otherwise hear its bookings. A failure (no
// subscription, no service worker, the back down) never blocks signing out.
export async function turnThisDevicePushOff() {
  try {
    const endpoint = await currentEndpoint()
    if (endpoint)
      await myNotificationsControllerPushOff(
        { endpoint },
        { signal: AbortSignal.timeout(TIMEOUT_MS) },
      )
  } catch {
    // Ignored on purpose.
  }
}
