import { useEffect, useEffectEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Typography } from 'ted-ui/Typography'

import {
  useMyNotificationsControllerTelegramOff,
  useTelegramLinkControllerLink,
} from '@/api/notifications/notifications'
import { ChannelRow } from '@/pages/book/notify/ChannelRow'
import styles from './Notifications.module.scss'

type Props = { connected: boolean; onChanged: () => void }

// Telegram: «Connect» asks for the deep link and offers it as a link to tap
// (window.open after the answer is blocked on iOS Safari); back from the bot,
// the page asks again. Connected: «On» and «Turn off».
export function TelegramRow({ connected, onChanged }: Props) {
  const { t } = useTranslation()
  const link = useTelegramLinkControllerLink()
  const off = useMyNotificationsControllerTelegramOff({
    mutation: { onSettled: onChanged },
  })

  const onVisible = useEffectEvent(() => {
    if (document.visibilityState === 'visible') onChanged()
  })
  const asked = link.data !== undefined
  useEffect(() => {
    if (!asked) return
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [asked])

  return (
    <ChannelRow
      label={t('notify.telegram')}
      on={connected}
      loading={link.isPending || off.isPending}
      onTurnOn={() => link.mutate()}
      onTurnOff={() => off.mutate()}
    >
      {link.data && (
        <Typography variant="t2">
          <a
            className={styles.link}
            href={link.data.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('notify.openTelegram')}
          </a>
        </Typography>
      )}
    </ChannelRow>
  )
}
