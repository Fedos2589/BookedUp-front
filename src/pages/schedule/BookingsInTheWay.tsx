import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Typography } from 'ted-ui/Typography'

import styles from './Schedule.module.scss'

// The answer to a schedule change the back refused over live bookings; the
// link opens the calendar where they can be cancelled or moved: on `date` (or
// today), and with a `staffId` on that master's week.
export function BookingsInTheWay({
  count,
  date,
  staffId,
}: {
  count: number
  date?: string
  staffId?: string
}) {
  const { t } = useTranslation()
  return (
    <div className={styles.failed}>
      <Typography variant="t4" color="red-300" role="alert">
        {t('schedule.bookingsInTheWay', { count })}
      </Typography>
      <Link
        to="/calendar"
        search={staffId ? { view: 'week', staffId, date } : { date }}
        className={styles.link}
      >
        {t('schedule.openCalendar')}
      </Link>
    </div>
  )
}
