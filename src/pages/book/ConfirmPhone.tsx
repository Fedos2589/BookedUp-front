import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Typography } from 'ted-ui/Typography'

import {
  getClientSessionControllerStatusQueryKey,
  useClientSessionControllerStart,
  useClientSessionControllerStatus,
} from '@/api/client-session/client-session'
import { ApiError } from '@/apiFetch'
import { currentLanguage } from '@/language'
import styles from './ConfirmPhone.module.scss'

const POLL_MS = 2000

// The client confirms their phone in the Telegram bot: a login is started, the
// page gives a link to the bot and polls until the bot answers. `confirmed`
// means the back has set the session cookie; the parent then asks for the phone.
export function ConfirmPhone({
  onConfirmed,
}: {
  // Asks the parent for the session; false: the bot said yes, the session isn't there.
  onConfirmed: () => Promise<boolean>
}) {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const locale = currentLanguage(i18n.language)

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
  const [lost, setLost] = useState(false)
  const begin = () => {
    setLost(false)
    start.mutate({ data: { locale } })
  }

  const asked = useRef(false)
  const askOnce = useEffectEvent(() => {
    if (asked.current) return
    asked.current = true
    begin()
  })
  useEffect(() => askOnce(), [])

  // Polls while pending (TanStack pauses it in a hidden tab; coming back asks
  // once more). Only this login's answer counts: an old one cached under the
  // same key is not read before the new login has started.
  const status = useClientSessionControllerStatus({
    query: {
      enabled: start.isSuccess,
      gcTime: 0,
      refetchInterval: (query) =>
        query.state.data?.status === 'pending' ? POLL_MS : false,
    },
  })
  const answer = start.isSuccess ? status.data?.status : undefined

  const confirmed = answer === 'confirmed'
  const confirm = useEffectEvent(() => onConfirmed().then((ok) => setLost(!ok)))
  useEffect(() => {
    if (confirmed) void confirm()
  }, [confirmed])

  // The link is where the client goes next: focus moves to it when it appears.
  const link = useRef<HTMLAnchorElement>(null)
  useEffect(() => link.current?.focus(), [start.data])

  if (start.isError) {
    const { status: code, body } =
      start.error instanceof ApiError
        ? start.error
        : { status: 0, body: undefined }
    if (code === 404 && (body as { code?: string })?.code === 'channelOff')
      return (
        <Typography role="alert">{t('booking.confirm.channelOff')}</Typography>
      )
  }

  const expired = answer === 'expired'
  if (start.isError || status.isError || expired || lost) {
    const tooMany =
      start.error instanceof ApiError && start.error.status === 429
    return (
      <div className={styles.block}>
        <Typography role="alert">
          {t(
            tooMany
              ? 'booking.tooManyAttempts'
              : expired
                ? 'booking.confirm.expired'
                : 'booking.confirm.failed',
          )}
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
            ref={link}
            className={styles.link}
            href={start.data.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('notify.openTelegram')}
          </a>
        </Typography>
      )}
      {start.data && (
        <Typography variant="t3">
          {t('booking.confirm.code', { code: start.data.code })}
        </Typography>
      )}
      <Typography variant="t3" role="status">
        {t('booking.confirm.waiting')}
      </Typography>
    </div>
  )
}
