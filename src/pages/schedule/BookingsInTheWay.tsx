import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Typography } from 'ted-ui/Typography'

import styles from '@/pages/schedule/Schedule.module.scss'

// The answer to a schedule change the back refused over live bookings; the
// link opens the calendar on `date` (or today) where they can be cancelled or moved.
export function BookingsInTheWay({
  count,
  date,
}: {
  count: number
  date?: string
}) {
  const { t } = useTranslation()
  return (
    <div className={styles.failed}>
      <Typography variant="t4" color="red-300" role="alert">
        {t('schedule.bookingsInTheWay', { count })}
      </Typography>
      <Link to="/calendar" search={{ date }}>
        {t('schedule.openCalendar')}
      </Link>
    </div>
  )
}
