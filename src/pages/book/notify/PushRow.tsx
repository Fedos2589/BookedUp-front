import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Typography } from 'ted-ui/Typography'

import {
  usePublicBookingControllerPushOff,
  usePublicBookingControllerPushOn,
} from '@/api/public-booking/public-booking'
import {
  currentEndpoint,
  PushDeniedError,
  PushDismissedError,
  pushSupport,
  subscribe,
} from '@/pwa/push'
import type { Language } from '@/language'
import { ChannelRow } from './ChannelRow'
import styles from './NotifyMe.module.scss'
import type { RowMutation } from './rowMutation'

type Props = {
  token: string
  locale: Language
  pushKey: string
  // The booking's subscribed endpoints, from every device.
  endpoints: string[]
  mutation: RowMutation
}

// Push on this device. «On» tells this browser's endpoint from the other
// devices' ones the booking has.
export function PushRow({
  token,
  locale,
  pushKey,
  endpoints,
  mutation,
}: Props) {
  const { t } = useTranslation()
  const support = pushSupport()
  const [here, setHere] = useState<string | null>(null)
  const [denied, setDenied] = useState(false)
  const [asking, setAsking] = useState(false)

  useEffect(() => {
    if (support === 'yes')
      void currentEndpoint().then(setHere, () => setHere(null))
  }, [support])

  const pushOn = usePublicBookingControllerPushOn({ mutation })
  const pushOff = usePublicBookingControllerPushOff({
    // The browser keeps one subscription for all of the client's bookings:
    // only this booking's row is dropped, the subscription stays.
    mutation,
  })

  if (support === 'no') return null
  if (support === 'installFirst')
    return (
      <li className={styles.row}>
        <Typography variant="t2" color="grey-500">
          {t('notify.pushInstall')}
        </Typography>
      </li>
    )

  const turnOn = async () => {
    setDenied(false)
    setAsking(true)
    try {
      const { endpoint, keys } = await subscribe(pushKey)
      if (!endpoint || !keys?.p256dh || !keys.auth)
        throw new Error('The browser gave an incomplete subscription')
      setHere(endpoint)
      pushOn.mutate({
        token,
        data: {
          subscription: {
            endpoint,
            keys: { p256dh: keys.p256dh, auth: keys.auth },
          },
          locale,
        },
      })
    } catch (error) {
      if (error instanceof PushDeniedError) setDenied(true)
      else if (!(error instanceof PushDismissedError)) mutation.onError(error)
    } finally {
      setAsking(false)
    }
  }

  return (
    <ChannelRow
      label={t('notify.push')}
      on={here !== null && endpoints.includes(here)}
      loading={asking || pushOn.isPending || pushOff.isPending}
      onTurnOn={() => void turnOn()}
      onTurnOff={() =>
        here && pushOff.mutate({ token, data: { endpoint: here } })
      }
    >
      {denied && (
        <Typography variant="t4" color="red-300" role="alert">
          {t('notify.pushDenied')}
        </Typography>
      )}
    </ChannelRow>
  )
}
