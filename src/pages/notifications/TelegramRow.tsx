import { useTranslation } from 'react-i18next'
import { Typography } from 'ted-ui/Typography'

import {
  useMyNotificationsControllerTelegramOff,
  useTelegramLinkControllerLink,
} from '@/api/notifications/notifications'
import { ChannelRow } from '@/notify/ChannelRow'
import styles from './Notifications.module.scss'

type Props = { connected: boolean; onChanged: () => void }

// Telegram: «Connect» asks for the deep link and offers it as a link to tap
// (window.open after the answer is blocked on iOS Safari). Back from the bot,
// the query's own refetch on window focus brings the new state. Connected:
// «On» and «Turn off».
export function TelegramRow({ connected, onChanged }: Props) {
  const { t } = useTranslation()
  const link = useTelegramLinkControllerLink()
  const off = useMyNotificationsControllerTelegramOff({
    // The old link's token is spent: never offer it again.
    mutation: { onSuccess: () => link.reset(), onSettled: onChanged },
  })

  return (
    <>
      <ChannelRow
        label={t('notify.telegram')}
        on={connected}
        loading={link.isPending || off.isPending}
        onTurnOn={() => {
          off.reset()
          link.mutate()
        }}
        onTurnOff={() => {
          link.reset()
          off.mutate()
        }}
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
      {(link.isError || off.isError) && (
        <li>
          <Typography variant="t4" color="red-300" role="alert">
            {t('notify.failed')}
          </Typography>
        </li>
      )}
    </>
  )
}
