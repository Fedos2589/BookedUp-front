import type { UseQueryResult } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Spinner } from 'ted-ui/Spinner/Spinner'
import { Typography } from 'ted-ui/Typography'

import styles from './Team.module.scss'

// A section's list while it loads, when it fails (with a retry), and once it
// is there: `children` gets the data.
export function Loaded<T>({
  query,
  children,
}: {
  query: UseQueryResult<T>
  children: (data: T) => ReactNode
}) {
  const { t } = useTranslation()

  if (query.isPending)
    return <Spinner size="medium" aria-label={t('common.loading')} />
  if (query.isError)
    return (
      <div className={styles.failed}>
        <Typography variant="t4" color="red-300" role="alert">
          {t('team.loadFailed')}
        </Typography>
        <Button
          variant="ghost"
          colorScheme="black"
          loading={query.isFetching}
          onClick={() => void query.refetch()}
        >
          {t('dashboard.tryAgain')}
        </Button>
      </div>
    )
  return children(query.data)
}
