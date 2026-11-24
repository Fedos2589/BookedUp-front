import { useTranslation } from 'react-i18next'
import { Typography } from 'ted-ui/Typography'

import {
  usePublicBookingControllerPushOff,
  usePublicBookingControllerPushOn,
} from '@/api/public-booking/public-booking'
import { ChannelRow } from '@/notify/ChannelRow'
import { PushInstallNote } from '@/notify/PushInstallNote'
import { usePushDevice } from '@/notify/usePushDevice'
import type { Language } from '@/language'
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
  const { support, here, denied, asking, turnOn } = usePushDevice(pushKey)

  const pushOn = usePublicBookingControllerPushOn({ mutation })
  const pushOff = usePublicBookingControllerPushOff({
    // The browser keeps one subscription for all of the client's bookings:
    // only this booking's row is dropped, the subscription stays.
    mutation,
  })

  if (support === 'no') return null
  if (support === 'installFirst') return <PushInstallNote />

  return (
    <ChannelRow
      label={t('notify.push')}
      on={!!here && endpoints.includes(here)}
      loading={asking || pushOn.isPending || pushOff.isPending}
      onTurnOn={() =>
        void turnOn(
          (subscription) =>
            pushOn.mutate({ token, data: { subscription, locale } }),
          mutation.onError,
        )
      }
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
