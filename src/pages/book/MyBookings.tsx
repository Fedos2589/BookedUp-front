import { useTranslation } from 'react-i18next'
import { Typography } from 'ted-ui/Typography'

import { usePublicBookingControllerMyBookings } from '@/api/public-booking/public-booking'
import { dateTimeIn } from '@/dates'
import styles from './BookingPage.module.scss'
import { useClientSession } from './useClientSession'

type Props = { slug: string; timeZone: string }

// The signed-in client's bookings at this business: each opens its own page
// (Cancel, Move). Nothing for a client without a session — not even a request.
export function MyBookings({ slug, timeZone }: Props) {
  const { t, i18n } = useTranslation()
  const { phone } = useClientSession()
  const mine = usePublicBookingControllerMyBookings(slug, {
    query: { enabled: phone !== null },
  })
  const bookings = phone === null ? [] : (mine.data?.bookings ?? [])
  if (bookings.length === 0) return null
  // Names tell the bookings apart only when they differ (a dependent's).
  const several = new Set(bookings.map((b) => b.clientName)).size > 1

  return (
    <section aria-labelledby="my-bookings">
      <Typography variant="h6" component="h2" id="my-bookings">
        {t('booking.myBookings')}
      </Typography>
      <ul className={styles.mine}>
        {bookings.map((b) => (
          <li key={b.id}>
            <a className={styles.saved} href={`/book/${slug}/my/${b.id}`}>
              {dateTimeIn(new Date(b.startsAt), timeZone, i18n.language)}
              {` · ${b.title ?? b.staffName}`}
              {several && ` · ${b.clientName}`}
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
