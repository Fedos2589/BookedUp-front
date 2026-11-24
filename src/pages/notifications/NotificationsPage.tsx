import { useTranslation } from 'react-i18next'
import { Spinner } from 'ted-ui/Spinner/Spinner'
import { Typography } from 'ted-ui/Typography'

import { useMyNotificationsControllerGet } from '@/api/notifications/notifications'
import { AllOnline } from './AllOnline'
import { MyChannels } from './MyChannels'
import styles from './Notifications.module.scss'

// Where the signed-in member picks their own channels (email, Telegram, push
// on this device) — every role, so not a part of the owner's Settings. WhatsApp
// is not here: it sends client templates only.
export function NotificationsPage() {
  const { t } = useTranslation()
  const mine = useMyNotificationsControllerGet()

  return (
    <main className={styles.page}>
      <Typography variant="h3" component="h1">
        {t('notifications.title')}
      </Typography>
      {mine.isPending && <Spinner aria-label={t('common.loading')} />}
      {mine.isError && (
        <Typography variant="t2" color="red-300" role="alert">
          {t('notifications.loadFailed')}
        </Typography>
      )}
      {mine.data && <MyChannels mine={mine.data} />}
      <AllOnline />
    </main>
  )
}
