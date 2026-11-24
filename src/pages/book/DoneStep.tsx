import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Typography } from 'ted-ui/Typography'

import type {
  PublicBookingControllerBook201,
  PublicBookingControllerBusiness200,
  PublicBookingControllerManaged200Notifications,
} from '@/api/generated.schemas'
import { getPublicBookingControllerManagedQueryOptions } from '@/api/public-booking/public-booking'
import { dateTimeIn, timeIn } from '@/dates'
import { CopyLink } from '@/forms/CopyLink'
import styles from './BookingPage.module.scss'
import { NotifyMe } from '@/pages/book/notify/NotifyMe'
import { useStepHeading } from './useStepHeading'

type Props = {
  booked: PublicBookingControllerBook201
  business: PublicBookingControllerBusiness200
}

// A new booking has nothing on until the client switches something.
const NOTHING_ON: PublicBookingControllerManaged200Notifications = {
  telegram: false,
  whatsapp: false,
  push: [],
  email: null,
}

// Step 4: the booking is made. The manage link is the only way to cancel or
// move it, so it is shown big and can be copied.
export function DoneStep({ booked, business }: Props) {
  const { name: businessName, timeZone } = business
  const { t, i18n } = useTranslation()
  const heading = useStepHeading()
  const { booking, manageLink } = booked
  // The token is the link's last segment.
  const token =
    new URL(manageLink).pathname.split('/').filter(Boolean).at(-1) ?? ''
  // Never fetched here: NotifyMe asks for the booking after each switch, and
  // this reads what it put in the cache.
  const managed = useQuery({
    ...getPublicBookingControllerManagedQueryOptions(token),
    enabled: false,
  })
  const when = [
    dateTimeIn(new Date(booking.startsAt), timeZone, i18n.language),
    timeIn(new Date(booking.endsAt), timeZone),
  ].join('–')

  return (
    <div className={styles.form}>
      <Typography variant="t2" component="h2" tabIndex={-1} ref={heading}>
        {t('booking.doneTitle')}
      </Typography>
      <Typography variant="t2" color="grey-500">
        {[when, booking.title, booking.staffName].filter(Boolean).join(' · ')}
      </Typography>
      <Typography variant="t2" color="grey-500">
        {businessName}
      </Typography>
      <CopyLink url={manageLink} label={t('booking.linkLabel')} />
      <Typography variant="t3" color="grey-500">
        {t('booking.saveLink')}
      </Typography>
      <NotifyMe
        slug={business.slug}
        token={token}
        channels={business.channels}
        notifications={managed.data?.notifications ?? NOTHING_ON}
        pushKey={business.pushKey}
      />
    </div>
  )
}
