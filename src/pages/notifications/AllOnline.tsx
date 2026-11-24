import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Checkbox } from 'ted-ui/Checkbox'
import { Typography } from 'ted-ui/Typography'

import {
  getMyBusinessNotificationsControllerGetQueryKey,
  useMyBusinessNotificationsControllerGet,
  useMyBusinessNotificationsControllerSet,
} from '@/api/notifications/notifications'
import { useCurrentBusiness } from '@/business/currentBusiness'
import styles from './Notifications.module.scss'

// «Tell me about every online booking of this business», for the owner and
// the admins. The back answers null to a master: nothing to show.
export function AllOnline() {
  const { t } = useTranslation()
  const business = useCurrentBusiness()
  const queryClient = useQueryClient()
  const current = useMyBusinessNotificationsControllerGet(business.id)
  const save = useMyBusinessNotificationsControllerSet({
    mutation: {
      onSettled: () =>
        queryClient.invalidateQueries({
          queryKey: getMyBusinessNotificationsControllerGetQueryKey(
            business.id,
          ),
        }),
    },
  })

  if (current.isError)
    return (
      <Typography variant="t4" color="red-300" role="alert">
        {t('notifications.loadFailed')}
      </Typography>
    )
  if (current.data?.allOnline == null) return null
  const checked = save.isPending
    ? save.variables.data.allOnline
    : current.data.allOnline

  return (
    <section className={styles.section}>
      <Checkbox
        label={t('notifications.allOnline')}
        checked={checked}
        onCheckedChange={(allOnline) =>
          save.mutate({ businessId: business.id, data: { allOnline } })
        }
      />
      {save.isError && (
        <Typography variant="t4" color="red-300" role="alert">
          {t('notify.failed')}
        </Typography>
      )}
    </section>
  )
}
