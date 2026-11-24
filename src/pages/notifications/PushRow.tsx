import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Typography } from 'ted-ui/Typography'

import {
  useMyNotificationsControllerPushOff,
  useMyNotificationsControllerPushOn,
} from '@/api/notifications/notifications'
import { ChannelRow } from '@/pages/book/notify/ChannelRow'
import {
  currentEndpoint,
  PushDeniedError,
  PushDismissedError,
  pushSupport,
  subscribe,
} from '@/pwa/push'

type Props = {
  pushKey: string
  // The member's devices, this one among them or not.
  endpoints: string[]
  onChanged: () => void
}

// Push on this device, told apart from the member's other devices by endpoint.
export function PushRow({ pushKey, endpoints, onChanged }: Props) {
  const { t } = useTranslation()
  const support = pushSupport()
  const [here, setHere] = useState<string | null>(null)
  const [denied, setDenied] = useState(false)
  const [failed, setFailed] = useState(false)
  const [asking, setAsking] = useState(false)

  useEffect(() => {
    if (support === 'yes')
      void currentEndpoint().then(setHere, () => setHere(null))
  }, [support])

  const mutation = { onSettled: onChanged, onError: () => setFailed(true) }
  const pushOn = useMyNotificationsControllerPushOn({ mutation })
  const pushOff = useMyNotificationsControllerPushOff({ mutation })

  if (support === 'no') return null
  if (support === 'installFirst')
    return (
      <li>
        <Typography variant="t2" color="grey-500">
          {t('notify.pushInstall')}
        </Typography>
      </li>
    )

  const on = here !== null && endpoints.includes(here)
  const others = endpoints.length - (on ? 1 : 0)

  const turnOn = async () => {
    setDenied(false)
    setFailed(false)
    setAsking(true)
    try {
      const { endpoint, keys } = await subscribe(pushKey)
      if (!endpoint || !keys?.p256dh || !keys.auth)
        throw new Error('The browser gave an incomplete subscription')
      setHere(endpoint)
      pushOn.mutate({
        data: {
          subscription: {
            endpoint,
            keys: { p256dh: keys.p256dh, auth: keys.auth },
          },
        },
      })
    } catch (error) {
      if (error instanceof PushDeniedError) setDenied(true)
      else if (!(error instanceof PushDismissedError)) setFailed(true)
    } finally {
      setAsking(false)
    }
  }

  return (
    <ChannelRow
      label={t('notify.push')}
      note={
        others > 0
          ? t('notifications.otherDevices', { count: others })
          : undefined
      }
      on={on}
      loading={asking || pushOn.isPending || pushOff.isPending}
      onTurnOn={() => void turnOn()}
      onTurnOff={() => here && pushOff.mutate({ data: { endpoint: here } })}
    >
      {denied && (
        <Typography variant="t4" color="red-300" role="alert">
          {t('notify.pushDenied')}
        </Typography>
      )}
      {failed && (
        <Typography variant="t4" color="red-300" role="alert">
          {t('notify.failed')}
        </Typography>
      )}
    </ChannelRow>
  )
}
