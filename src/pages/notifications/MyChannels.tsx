import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Checkbox } from 'ted-ui/Checkbox'
import { Typography } from 'ted-ui/Typography'

import type { MyNotificationsControllerGet200 } from '@/api/generated.schemas'
import {
  getMyNotificationsControllerGetQueryKey,
  useMyNotificationsControllerSet,
} from '@/api/notifications/notifications'
import styles from './Notifications.module.scss'
import { PushRow } from './PushRow'
import { TelegramRow } from './TelegramRow'

type Props = { mine: MyNotificationsControllerGet200 }

// The member's own channels, only those the back has on.
export function MyChannels({ mine }: Props) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const reload = () =>
    queryClient.invalidateQueries({
      queryKey: getMyNotificationsControllerGetQueryKey(),
    })
  const setEmail = useMyNotificationsControllerSet({
    mutation: { onSettled: reload },
  })
  const email = setEmail.isPending ? setEmail.variables.data.email : mine.email
  const { available } = mine

  return (
    <section className={styles.section}>
      <Typography variant="h5" component="h2">
        {t('notifications.channels')}
      </Typography>
      <ul className={styles.list}>
        {available.email && (
          <li className={styles.row}>
            <Checkbox
              label={t('notify.email')}
              checked={email}
              onCheckedChange={(on) => setEmail.mutate({ data: { email: on } })}
            />
          </li>
        )}
        {available.telegram && (
          <TelegramRow connected={mine.telegram} onChanged={reload} />
        )}
        {available.push && mine.pushKey !== null && (
          <PushRow
            pushKey={mine.pushKey}
            endpoints={mine.push}
            onChanged={reload}
          />
        )}
      </ul>
      {setEmail.isError && (
        <Typography variant="t4" color="red-300" role="alert">
          {t('notify.failed')}
        </Typography>
      )}
    </section>
  )
}
