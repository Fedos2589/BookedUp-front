import { getRouteApi } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Spinner } from 'ted-ui/Spinner/Spinner'
import { Typography } from 'ted-ui/Typography'

import { useMeControllerMeSuspense } from '@/api/account/account'
import { useStaffControllerList } from '@/api/staff/staff'
import { useCurrentBusiness } from '@/business/currentBusiness'
import { dateIn } from '@/dates'
import { useNow } from '@/useNow'
import { CalendarHeader } from './CalendarHeader'
import styles from './Calendar.module.scss'

const route = getRouteApi('/cabinet/calendar')

// The bookings of the business, a day (a column per master) or a week (one
// master). A master is shown their own column only, whatever the address says.
// The grid itself comes with F3; here the header and who is looked at.
export function CalendarPage() {
  const { t } = useTranslation()
  const business = useCurrentBusiness()
  const { data: account } = useMeControllerMeSuspense()
  const search = route.useSearch()
  const view = search.view ?? 'day'
  const staff = useStaffControllerList(business.id)

  const now = useNow()
  const today = dateIn(now, business.timeZone) ?? dateIn(now, 'UTC')!
  const date = search.date ?? today
  const masters = (staff.data ?? []).filter(
    (s) =>
      !s.archived &&
      (business.role !== 'MASTER' || s.userId === account.user.id),
  )
  const master =
    masters.find((s) => s.id === search.staffId) ??
    masters.find((s) => s.userId === account.user.id) ??
    masters[0]

  return (
    <main className={styles.page}>
      <Typography variant="h3" component="h1">
        {t('calendar.title')}
      </Typography>
      {staff.isPending && (
        <Spinner size="medium" aria-label={t('common.loading')} />
      )}
      {staff.isError && !staff.data && (
        <div className={styles.failed}>
          <Typography variant="t4" color="red-300" role="alert">
            {t('calendar.loadFailed')}
          </Typography>
          <Button
            variant="ghost"
            colorScheme="black"
            onClick={() => void staff.refetch()}
          >
            {t('common.tryAgain')}
          </Button>
        </div>
      )}
      {staff.data && (
        <>
          <CalendarHeader
            view={view}
            date={date}
            today={today}
            masters={masters}
            master={master}
          />
          <Typography variant="t3" component="p">
            {t('calendar.placeholder')}
          </Typography>
        </>
      )}
    </main>
  )
}
