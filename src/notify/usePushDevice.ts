import { useEffect, useState } from 'react'

import {
  currentEndpoint,
  PushDeniedError,
  PushDismissedError,
  pushSupport,
  subscribe,
} from '@/pwa/push'

export type PushSubscriptionBody = {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

// This browser's side of a push row, shared by the booking page and the
// cabinet: can it push, which endpoint is this device's (`undefined` until
// the browser has answered, `null` when it has none), and turning on.
export function usePushDevice(pushKey: string) {
  const support = pushSupport()
  const [here, setHere] = useState<string | null | undefined>(undefined)
  const [denied, setDenied] = useState(false)
  const [asking, setAsking] = useState(false)

  useEffect(() => {
    if (support === 'yes')
      void currentEndpoint().then(setHere, () => setHere(null))
  }, [support])

  // `send` hands the subscription to the back; `onError` hears every failure
  // except a blocked or closed prompt, which the row says by itself.
  const turnOn = async (
    send: (subscription: PushSubscriptionBody) => void,
    onError: (error: unknown) => void,
  ) => {
    setDenied(false)
    setAsking(true)
    try {
      const { endpoint, keys } = await subscribe(pushKey)
      if (!endpoint || !keys?.p256dh || !keys.auth)
        throw new Error('The browser gave an incomplete subscription')
      setHere(endpoint)
      send({ endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } })
    } catch (error) {
      if (error instanceof PushDeniedError) setDenied(true)
      else if (!(error instanceof PushDismissedError)) onError(error)
    } finally {
      setAsking(false)
    }
  }

  return { support, here, denied, asking, turnOn }
}
