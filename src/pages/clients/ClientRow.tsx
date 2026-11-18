import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Typography } from 'ted-ui/Typography'

import type { ClientsControllerList200ItemsItem } from '@/api/generated.schemas'
import styles from './Clients.module.scss'

// One client: the name opens their card; under it the phone, or whose account
// a dependent comes with, and the no-shows when there are any.
export function ClientRow({
  client,
}: {
  client: ClientsControllerList200ItemsItem
}) {
  const { t } = useTranslation()

  return (
    <li className={styles.row}>
      <Typography variant="t2">
        <Link
          to="/clients/$clientId"
          params={{ clientId: client.id }}
          className={styles.link}
        >
          {client.name}
        </Link>
      </Typography>
      <Typography variant="t4" color="grey-400">
        {client.guardian
          ? t('clients.via', { name: client.guardian.name })
          : client.phone}
      </Typography>
      {client.noShowCount > 0 && (
        <Typography variant="t4" color="red-300">
          {t('clients.noShows', { count: client.noShowCount })}
        </Typography>
      )}
    </li>
  )
}
