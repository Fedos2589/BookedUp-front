import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useEffectEvent, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Typography } from 'ted-ui/Typography'

import {
  getClientSessionControllerStatusQueryKey,
  useClientSessionControllerStart,
  useClientSessionControllerStatus,
} from '@/api/client-session/client-session'
import { ApiError } from '@/apiFetch'
import { isLanguage } from '@/language'
import styles from './ConfirmPhone.module.scss'

const POLL_MS = 2000

// The client confirms their phone in the Telegram bot: a login is started, the
// page gives a link to the bot and polls until the bot answers. `confirmed`
// means the back has set the session cookie; the parent then asks for the phone.
export function ConfirmPhone({ onConfirmed }: { onConfirmed: () => void }) {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const locale = isLanguage(i18n.language) ? i18n.language : 'en'

  // The messages' language is the one the login starts with. The old answer
  // (`expired`) must not be read as the new login's.
  const start = useClientSessionControllerStart({
    mutation: {
      onMutate: () =>
        queryClient.removeQueries({
          queryKey: getClientSessionControllerStatusQueryKey(),
        }),
    },
  })
  const begin = () => start.mutate({ data: { locale } })

  const asked = useRef(false)
  const askOnce = useEffectEvent(() => {
    if (asked.current) return
    asked.current = true
    begin()
  })
  useEffect(() => askOnce(), [])

  // Polls only while pending and the page is visible; coming back to a visible
  // page asks once more (window focus).
  const status = useClientSessionControllerStatus({
    query: {
      enabled: start.isSuccess,
      refetchInterval: (query) =>
        query.state.data?.status === 'pending' &&
        document.visibilityState === 'visible'
          ? POLL_MS
          : false,
    },
  })

  const confirmed = status.data?.status === 'confirmed'
  const confirm = useEffectEvent(onConfirmed)
  useEffect(() => {
    if (confirmed) confirm()
  }, [confirmed])

  if (start.isError) {
    const { status: code, body } =
      start.error instanceof ApiError
        ? start.error
        : { status: 0, body: undefined }
    if (code === 404 && (body as { code?: string })?.code === 'channelOff')
      return (
        <Typography role="alert">{t('booking.confirm.channelOff')}</Typography>
      )
    if (code === 429)
      return (
        <Typography role="alert">{t('booking.tooManyAttempts')}</Typography>
      )
  }

  const expired = status.data?.status === 'expired'
  if (start.isError || status.isError || expired) {
    return (
      <div className={styles.block}>
        <Typography role="alert">
          {t(expired ? 'booking.confirm.expired' : 'booking.confirm.failed')}
        </Typography>
        <Button variant="solid" colorScheme="black" onClick={begin}>
          {t('common.tryAgain')}
        </Button>
      </div>
    )
  }

  return (
    <div className={styles.block}>
      {/* A link the client taps: window.open after the answer is blocked by iOS
        Safari, which only allows it inside the tap itself. */}
      {start.data && (
        <Typography variant="t2">
          <a
            className={styles.link}
            href={start.data.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('notify.openTelegram')}
          </a>
        </Typography>
      )}
      <Typography variant="t3" role="status">
        {t('booking.confirm.waiting')}
      </Typography>
    </div>
  )
}
