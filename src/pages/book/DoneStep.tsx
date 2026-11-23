import { useTranslation } from 'react-i18next'
import { Typography } from 'ted-ui/Typography'

import type { PublicBookingControllerBook201 } from '@/api/generated.schemas'
import { dateTimeIn, timeIn } from '@/dates'
import { CopyLink } from '@/forms/CopyLink'
import styles from './BookingPage.module.scss'
import { useStepHeading } from './useStepHeading'

type Props = {
  booked: PublicBookingControllerBook201
  businessName: string
  timeZone: string
}

// Step 4: the booking is made. The manage link is the only way to cancel or
// move it, so it is shown big and can be copied.
export function DoneStep({ booked, businessName, timeZone }: Props) {
  const { t, i18n } = useTranslation()
  const heading = useStepHeading()
  const { booking, manageLink } = booked
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
    </div>
  )
}
