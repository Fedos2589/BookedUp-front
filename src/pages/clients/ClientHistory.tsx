import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Spinner } from 'ted-ui/Spinner/Spinner'
import { Typography } from 'ted-ui/Typography'

import { useStaffControllerList } from '@/api/staff/staff'
import { useCurrentBusiness } from '@/business/currentBusiness'
import { dateTimeIn } from '@/dates'
import styles from './Clients.module.scss'
import { rowsOf } from './paging'
import { useClientHistory } from './useClientHistory'

// The client's bookings, newest first, with when (in the business's time
// zone), whose and the status; «Show more» while there are more.
export function ClientHistory({ clientId }: { clientId: string }) {
  const { t, i18n } = useTranslation()
  const business = useCurrentBusiness()
  const history = useClientHistory(business.id, clientId)
  const staff = useStaffControllerList(business.id)
  const masterName = (id: string) =>
    staff.data?.find((s) => s.id === id)?.name ?? '—'

  if (history.isPending)
    return <Spinner size="medium" aria-label={t('common.loading')} />
  if (history.isError)
    return (
      <div className={styles.failed}>
        <Typography variant="t4" color="red-300" role="alert">
          {t('clients.history.loadFailed')}
        </Typography>
        <Button
          variant="ghost"
          colorScheme="black"
          loading={history.isFetching}
          onClick={() => void history.refetch()}
        >
          {t('common.tryAgain')}
        </Button>
      </div>
    )

  const items = rowsOf(history.data.pages)
  if (items.length === 0)
    return (
      <Typography variant="t3" color="grey-400">
        {t('clients.history.empty')}
      </Typography>
    )

  return (
    <>
      <ul className={styles.list} aria-label={t('clients.history.title')}>
        {items.map((booking) => (
          <li key={booking.id} className={styles.row}>
            <Typography variant="t2">
              {dateTimeIn(
                new Date(booking.startsAt),
                business.timeZone,
                i18n.language,
              ) ?? booking.startsAt}
            </Typography>
            <Typography variant="t4" color="grey-400">
              {masterName(booking.staffId)}
            </Typography>
            <Typography
              variant="t4"
              color={booking.status === 'NO_SHOW' ? 'red-300' : 'grey-400'}
            >
              {t(`calendar.booking.status.${booking.status}`)}
            </Typography>
          </li>
        ))}
      </ul>
      {history.hasNextPage && (
        <Button
          variant="ghost"
          colorScheme="black"
          loading={history.isFetchingNextPage}
          onClick={() => void history.fetchNextPage()}
        >
          {t('clients.showMore')}
        </Button>
      )}
    </>
  )
}
