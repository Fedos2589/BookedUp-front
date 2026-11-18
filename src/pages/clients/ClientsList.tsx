import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { EmptyState } from 'ted-ui/EmptyState'
import { Spinner } from 'ted-ui/Spinner/Spinner'
import { Typography } from 'ted-ui/Typography'
import { RiUserLine } from '@remixicon/react'

import { useCurrentBusiness } from '@/business/currentBusiness'
import { ClientRow } from './ClientRow'
import styles from './Clients.module.scss'
import { useClientsList } from './useClientsList'

// The clients matching `q` as rows, «Show more» while there are more; the
// states around it: loading, failed (retry), nobody yet, nobody found.
export function ClientsList({ q }: { q: string | undefined }) {
  const { t } = useTranslation()
  const business = useCurrentBusiness()
  const clients = useClientsList(business.id, q)

  if (clients.isPending)
    return <Spinner size="medium" aria-label={t('common.loading')} />
  if (clients.isError)
    return (
      <div className={styles.failed}>
        <Typography variant="t4" color="red-300" role="alert">
          {t('clients.loadFailed')}
        </Typography>
        <Button
          variant="ghost"
          colorScheme="black"
          loading={clients.isFetching}
          onClick={() => void clients.refetch()}
        >
          {t('common.tryAgain')}
        </Button>
      </div>
    )

  const items = clients.data.pages.flatMap((page) => page.items)
  if (items.length === 0)
    return (
      <EmptyState
        icon={<RiUserLine />}
        headingLevel={2}
        title={t(q ? 'clients.nobodyFound' : 'clients.empty.title')}
        text={q ? t('clients.nobodyFoundText') : t('clients.empty.text')}
      />
    )

  return (
    <>
      <ul className={styles.list} aria-label={t('clients.listLabel')}>
        {items.map((client) => (
          <ClientRow key={client.id} client={client} />
        ))}
      </ul>
      {clients.hasNextPage && (
        <Button
          variant="ghost"
          colorScheme="black"
          loading={clients.isFetchingNextPage}
          onClick={() => void clients.fetchNextPage()}
        >
          {t('clients.showMore')}
        </Button>
      )}
    </>
  )
}
