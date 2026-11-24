import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useEffectEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Typography } from 'ted-ui/Typography'

import type {
  PublicBookingControllerBusiness200Channels,
  PublicBookingControllerManaged200Notifications,
} from '@/api/generated.schemas'
import {
  getPublicBookingControllerBusinessQueryKey,
  getPublicBookingControllerManagedQueryKey,
  usePublicBookingControllerTelegramLink,
  usePublicBookingControllerWhatsappOff,
  usePublicBookingControllerWhatsappOn,
} from '@/api/public-booking/public-booking'
import { ApiError } from '@/apiFetch'
import { isLanguage } from '@/language'
import { ChannelRow } from './ChannelRow'
import styles from './NotifyMe.module.scss'

type Props = {
  slug: string
  token: string
  channels: PublicBookingControllerBusiness200Channels
  notifications: PublicBookingControllerManaged200Notifications
  // The client card's number, masked: the label of the WhatsApp button.
  phone: string
}

// «Get a reminder»: a row per channel the business has on, for this booking.
// Telegram and WhatsApp here; push and email come next to them.
export function NotifyMe({
  slug,
  token,
  channels,
  notifications,
  phone,
}: Props) {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const [locked, setLocked] = useState(false)
  const [failed, setFailed] = useState(false)
  const locale = isLanguage(i18n.language) ? i18n.language : 'en'

  // refetch, not invalidate: invalidate skips a query nobody is watching.
  const refetchBooking = () =>
    queryClient.refetchQueries({
      queryKey: getPublicBookingControllerManagedQueryKey(token),
    })

  // Back from Telegram (the tab is visible again): the bot may have connected.
  const onVisible = useEffectEvent(() => {
    if (document.visibilityState === 'visible') void refetchBooking()
  })
  useEffect(() => {
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // 409: the booking can't change any more; 404 channelOff: the business
  // turned the channel off since the page was loaded, so ask for it again.
  // Anything else (no network, 5xx, another 404) is a plain failure.
  const onError = (error: unknown) => {
    const body =
      error instanceof ApiError ? (error.body as { code?: string }) : null
    if (error instanceof ApiError && error.status === 409) setLocked(true)
    else if (
      error instanceof ApiError &&
      error.status === 404 &&
      body?.code === 'channelOff'
    )
      void queryClient.refetchQueries({
        queryKey: getPublicBookingControllerBusinessQueryKey(slug),
      })
    else setFailed(true)
  }
  const options = {
    mutation: {
      onMutate: () => setFailed(false),
      onError,
      onSettled: refetchBooking,
    },
  }
  const telegram = usePublicBookingControllerTelegramLink(options)
  const whatsappOn = usePublicBookingControllerWhatsappOn(options)
  const whatsappOff = usePublicBookingControllerWhatsappOff(options)

  if (!channels.telegram && !channels.whatsapp) return null

  return (
    <section className={styles.block}>
      <Typography variant="h5" component="h2">
        {t('notify.title')}
      </Typography>
      <ul className={styles.list}>
        {channels.telegram && (
          <ChannelRow
            label={t('notify.telegram')}
            on={notifications.telegram}
            loading={telegram.isPending}
            onTurnOn={() => telegram.mutate({ token, data: { locale } })}
          >
            {/* A link the client taps: window.open after the answer is blocked
                by iOS Safari, which only allows it inside the tap itself. */}
            {telegram.data && (
              <a
                className={styles.link}
                href={telegram.data.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('notify.openTelegram')}
              </a>
            )}
          </ChannelRow>
        )}
        {channels.whatsapp && (
          <ChannelRow
            label={t('notify.whatsapp', { phone })}
            note={t('notify.whatsappNote')}
            on={notifications.whatsapp}
            loading={whatsappOn.isPending || whatsappOff.isPending}
            onTurnOn={() => whatsappOn.mutate({ token, data: { locale } })}
            onTurnOff={() => whatsappOff.mutate({ token })}
          />
        )}
      </ul>
      {failed && (
        <Typography variant="t4" color="red-300" role="alert">
          {t('notify.failed')}
        </Typography>
      )}
      {locked && (
        <Typography variant="t4" color="red-300" role="alert">
          {t('notify.locked')}
        </Typography>
      )}
    </section>
  )
}
