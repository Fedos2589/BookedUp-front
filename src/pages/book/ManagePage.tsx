import { getRouteApi } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Typography } from 'ted-ui/Typography'

import { usePublicBookingControllerManaged } from '@/api/public-booking/public-booking'
import { ApiError } from '@/apiFetch'
import { dateTimeIn, timeIn } from '@/dates'
import { PagePending } from '@/pages/PagePending'
import styles from './BookingPage.module.scss'
import { CancelBooking } from './CancelBooking'
import { LoadFailed } from './LoadFailed'
import { MoveBooking } from './MoveBooking'
import { useBusinessManifest } from './useBusinessManifest'

const route = getRouteApi('/book/$businessSlug/manage/$token')

// The client's private link: what they booked. No sign-in; the token is the key.
export function ManagePage() {
  const { businessSlug, token } = route.useParams()
  const { t, i18n } = useTranslation()
  const managed = usePublicBookingControllerManaged(token)
  const [moving, setMoving] = useState(false)
  useBusinessManifest(businessSlug, managed.data?.business.name)

  // 400 is a token of the wrong shape, 404 one nobody holds: both are a dead link.
  if (
    managed.error instanceof ApiError &&
    (managed.error.status === 404 || managed.error.status === 400)
  ) {
    return (
      <main className={styles.page}>
        <Typography variant="h3" component="h1">
          {t('booking.badLink')}
        </Typography>
      </main>
    )
  }
  if (managed.isError && !managed.data) {
    return <LoadFailed onRetry={() => void managed.refetch()} />
  }
  if (!managed.data) return <PagePending />

  const { business, booking } = managed.data
  const when = [
    dateTimeIn(new Date(booking.startsAt), business.timeZone, i18n.language),
    timeIn(new Date(booking.endsAt), business.timeZone),
  ].join('–')

  return (
    <main className={styles.page}>
      <Typography variant="h3" component="h1">
        {business.name}
      </Typography>
      <Typography variant="t2" color="grey-500">
        {[when, booking.title, booking.staffName].filter(Boolean).join(' · ')}
      </Typography>
      <Typography variant="t2">
        {t(`booking.manageStatus.${booking.status}`)}
      </Typography>
      {managed.data.canChange &&
        (moving ? (
          <MoveBooking
            token={token}
            slug={business.slug}
            booking={booking}
            onMoved={() => setMoving(false)}
            onBack={() => setMoving(false)}
          />
        ) : (
          <>
            <Button
              variant="solid"
              colorScheme="blue"
              className={styles.retry}
              onClick={() => setMoving(true)}
            >
              {t('booking.changeTime')}
            </Button>
            <CancelBooking token={token} slug={business.slug} />
          </>
        ))}
    </main>
  )
}
