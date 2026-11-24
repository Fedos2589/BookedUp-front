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
  getPublicBookingControllerManagedQueryOptions,
  usePublicBookingControllerTelegramLink,
  usePublicBookingControllerWhatsappOff,
  usePublicBookingControllerWhatsappOn,
} from '@/api/public-booking/public-booking'
import { ApiError } from '@/apiFetch'
import { isLanguage } from '@/language'
import { pushSupport } from '@/pwa/push'
import { ChannelRow } from '@/notify/ChannelRow'
import { EmailRow } from './EmailRow'
import { PushRow } from './PushRow'
import styles from './NotifyMe.module.scss'

type Props = {
  slug: string
  token: string
  channels: PublicBookingControllerBusiness200Channels
  notifications: PublicBookingControllerManaged200Notifications
  // The VAPID key push subscribes with; null when the back has push off.
  pushKey: string | null
  // The client card's number, masked: the label of the WhatsApp button.
  // The back doesn't send it to the booking pages yet: then just «WhatsApp».
  phone?: string
}

// «Get a reminder»: a row per channel the business has on, for this booking.
export function NotifyMe({
  slug,
  token,
  channels,
  notifications,
  pushKey,
  phone,
}: Props) {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const [locked, setLocked] = useState(false)
  const [failed, setFailed] = useState(false)
  const locale = isLanguage(i18n.language) ? i18n.language : 'en'

  // fetchQuery, not refetch/invalidate: those skip a query nobody watches or
  // one that is disabled, and the parent may keep it so until the first switch.
  const refetchBooking = () =>
    queryClient
      .fetchQuery({
        ...getPublicBookingControllerManagedQueryOptions(token),
        staleTime: 0,
      })
      .catch(() => undefined)

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
  const mutation = { onMutate: () => setFailed(false), onError }
  // A telegram-link answer changes nothing on the booking: no refetch after it.
  const telegram = usePublicBookingControllerTelegramLink({ mutation })
  const rowMutation = { ...mutation, onSettled: refetchBooking }
  const whatsappOptions = { mutation: rowMutation }
  const whatsappOn = usePublicBookingControllerWhatsappOn(whatsappOptions)
  const whatsappOff = usePublicBookingControllerWhatsappOff(whatsappOptions)

  // Back from Telegram (the tab is visible again): the bot may have connected.
  // Only once a link was given out; window focus covers the rest.
  const onVisible = useEffectEvent(() => {
    if (document.visibilityState === 'visible') void refetchBooking()
  })
  const telegramAsked = telegram.data !== undefined
  useEffect(() => {
    if (!telegramAsked) return
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [telegramAsked])

  // Push counts only where its row can show: a key and a browser that can.
  const pushShown = channels.push && pushKey !== null && pushSupport() !== 'no'
  if (!channels.telegram && !channels.whatsapp && !pushShown && !channels.email)
    return null

  return (
    <section className={styles.block}>
      <Typography variant="h5" component="h2">
        {t('notify.title')}
      </Typography>
      {!locked && (
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
                <Typography variant="t2">
                  <a
                    className={styles.link}
                    href={telegram.data.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t('notify.openTelegram')}
                  </a>
                </Typography>
              )}
            </ChannelRow>
          )}
          {channels.whatsapp && (
            <ChannelRow
              label={
                phone
                  ? t('notify.whatsapp', { phone })
                  : t('notify.whatsappPlain')
              }
              note={t('notify.whatsappNote')}
              on={notifications.whatsapp}
              loading={whatsappOn.isPending || whatsappOff.isPending}
              onTurnOn={() => whatsappOn.mutate({ token, data: { locale } })}
              onTurnOff={() => whatsappOff.mutate({ token })}
            />
          )}
          {pushShown && pushKey && (
            <PushRow
              token={token}
              locale={locale}
              pushKey={pushKey}
              endpoints={notifications.push}
              mutation={rowMutation}
            />
          )}
          {channels.email && (
            <EmailRow
              token={token}
              locale={locale}
              email={notifications.email}
              mutation={rowMutation}
            />
          )}
        </ul>
      )}
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
