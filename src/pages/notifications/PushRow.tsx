import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Typography } from 'ted-ui/Typography'

import {
  useMyNotificationsControllerPushOff,
  useMyNotificationsControllerPushOn,
} from '@/api/notifications/notifications'
import { ChannelRow } from '@/notify/ChannelRow'
import { PushInstallNote } from '@/notify/PushInstallNote'
import { usePushDevice } from '@/notify/usePushDevice'

type Props = {
  pushKey: string
  // The member's devices, this one among them or not.
  endpoints: string[]
  onChanged: () => void
}

// Push on this device, told apart from the member's other devices by endpoint.
export function PushRow({ pushKey, endpoints, onChanged }: Props) {
  const { t } = useTranslation()
  const { support, here, denied, asking, turnOn } = usePushDevice(pushKey)
  const [failed, setFailed] = useState(false)

  const mutation = {
    onMutate: () => setFailed(false),
    onError: () => setFailed(true),
    onSettled: onChanged,
  }
  const pushOn = useMyNotificationsControllerPushOn({ mutation })
  const pushOff = useMyNotificationsControllerPushOff({ mutation })

  if (support === 'no') return null
  if (support === 'installFirst') return <PushInstallNote />
  // Until the browser says which endpoint is its own, «this device» is unknown.
  if (here === undefined) return null

  const on = here !== null && endpoints.includes(here)
  const others = endpoints.length - (on ? 1 : 0)

  return (
    <>
      <ChannelRow
        label={t('notify.push')}
        note={
          others > 0
            ? t('notifications.otherDevices', { count: others })
            : undefined
        }
        on={on}
        loading={asking || pushOn.isPending || pushOff.isPending}
        onTurnOn={() => {
          setFailed(false)
          void turnOn(
            (subscription) => pushOn.mutate({ data: { subscription } }),
            () => setFailed(true),
          )
        }}
        onTurnOff={() => here && pushOff.mutate({ data: { endpoint: here } })}
      >
        {denied && (
          <Typography variant="t4" color="red-300" role="alert">
            {t('notify.pushDenied')}
          </Typography>
        )}
      </ChannelRow>
      {/* Outside the row: it shows children only while the channel is off. */}
      {failed && (
        <li>
          <Typography variant="t4" color="red-300" role="alert">
            {t('notify.failed')}
          </Typography>
        </li>
      )}
    </>
  )
}
