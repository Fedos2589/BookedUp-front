import { getRouteApi, Link } from '@tanstack/react-router'
import { Trans, useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Spinner } from 'ted-ui/Spinner/Spinner'
import { Typography } from 'ted-ui/Typography'

import { useClientsControllerCard } from '@/api/clients/clients'
import { useCurrentBusiness } from '@/business/currentBusiness'
import { ApiError } from '@/apiFetch'
import { ClientHistory } from './ClientHistory'
import styles from './Clients.module.scss'

const route = getRouteApi('/cabinet/clients/$clientId')

// One client: the phone (or whose account a dependent comes with), the
// dependents, the counters, the note and the history of bookings.
export function ClientPage() {
  const { t } = useTranslation()
  const business = useCurrentBusiness()
  const { clientId } = route.useParams()
  const card = useClientsControllerCard(business.id, clientId)

  if (card.isPending)
    return (
      <main className={styles.page}>
        <Spinner size="medium" aria-label={t('common.loading')} />
      </main>
    )
  if (card.isError) {
    const missing = card.error instanceof ApiError && card.error.status === 404
    return (
      <main className={styles.page}>
        <Typography variant="h3" component="h1">
          {t(missing ? 'clients.notFound' : 'clients.cardFailed')}
        </Typography>
        {!missing && (
          <Button
            variant="ghost"
            colorScheme="black"
            loading={card.isFetching}
            onClick={() => void card.refetch()}
          >
            {t('common.tryAgain')}
          </Button>
        )}
        <Link to="/clients" className={styles.link}>
          {t('clients.all')}
        </Link>
      </main>
    )
  }

  const client = card.data
  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <Typography variant="h3" component="h1">
          {client.name}
        </Typography>
        {/* Enabled with the edit dialog (E8 F4). */}
        <Button variant="solid" colorScheme="black" disabled>
          {t('clients.edit')}
        </Button>
      </div>
      <Typography variant="t2">
        {client.guardian ? (
          <Trans
            i18nKey="clients.viaLink"
            values={{ name: client.guardian.name }}
            components={{
              guardian: (
                <Link
                  to="/clients/$clientId"
                  params={{ clientId: client.guardian.id }}
                  className={styles.link}
                />
              ),
            }}
          />
        ) : (
          client.phone
        )}
      </Typography>
      {client.dependents.length > 0 && (
        <ul className={styles.list} aria-label={t('clients.dependents')}>
          {client.dependents.map((dependent) => (
            <li key={dependent.id} className={styles.row}>
              <Typography variant="t2">
                <Link
                  to="/clients/$clientId"
                  params={{ clientId: dependent.id }}
                  className={styles.link}
                >
                  {dependent.name}
                </Link>
              </Typography>
            </li>
          ))}
        </ul>
      )}
      <div className={styles.counters}>
        <Typography variant="t2">
          {t('clients.visits', { count: client.visitCount })}
        </Typography>
        <Typography
          variant="t2"
          color={client.noShowCount > 0 ? 'red-300' : undefined}
        >
          {t('clients.noShows', { count: client.noShowCount })}
        </Typography>
      </div>
      {client.note && <Typography variant="t3">{client.note}</Typography>}
      <Typography variant="h5" component="h2">
        {t('clients.history.title')}
      </Typography>
      <ClientHistory clientId={clientId} />
    </main>
  )
}
