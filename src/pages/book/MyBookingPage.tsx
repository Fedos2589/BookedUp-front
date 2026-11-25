import { useQueryClient } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Typography } from 'ted-ui/Typography'

import {
  getPublicBookingControllerMyBookingsQueryKey,
  usePublicBookingControllerBusiness,
  usePublicBookingControllerCancelMine,
  usePublicBookingControllerMoveMine,
  usePublicBookingControllerMyBookings,
} from '@/api/public-booking/public-booking'
import { dateTimeIn, timeIn } from '@/dates'
import { PagePending } from '@/pages/PagePending'
import styles from './BookingPage.module.scss'
import { CancelBooking } from './CancelBooking'
import { ConfirmPhone } from './ConfirmPhone'
import { LoadFailed } from './LoadFailed'
import { MoveBooking } from './MoveBooking'
import { useBusinessManifest } from './useBusinessManifest'
import { useClientSession } from './useClientSession'

const route = getRouteApi('/book/$businessSlug/my/$bookingId')

// One booking of the signed-in client: the item comes from their list (there is
// no GET by id). Without a session the phone is confirmed first.
export function MyBookingPage() {
  const { businessSlug: slug, bookingId } = route.useParams()
  const { t, i18n } = useTranslation()
  const session = useClientSession()
  const business = usePublicBookingControllerBusiness(slug)
  const mine = usePublicBookingControllerMyBookings(slug, {
    query: { enabled: session.phone !== null },
  })
  const [moving, setMoving] = useState(false)
  const queryClient = useQueryClient()
  // Whatever the answer, the list is asked for again: a change refused because
  // the time has passed must show the booking as it is now.
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: getPublicBookingControllerMyBookingsQueryKey(slug),
    })
  const cancel = usePublicBookingControllerCancelMine({
    mutation: { onSettled: invalidate },
  })
  const move = usePublicBookingControllerMoveMine({
    mutation: { onSuccess: () => setMoving(false), onSettled: invalidate },
  })
  useBusinessManifest(slug, business.data?.name)

  if (business.isError && !business.data) {
    return <LoadFailed onRetry={() => void business.refetch()} />
  }
  if (session.isLoading || !business.data) return <PagePending />

  if (session.phone === null) {
    return (
      <main className={styles.page}>
        <Typography variant="h3" component="h1">
          {business.data.name}
        </Typography>
        <ConfirmPhone
          onConfirmed={async () => {
            const { data } = await session.refresh()
            return Boolean(data?.phone)
          }}
        />
      </main>
    )
  }
  if (mine.isError && !mine.data) {
    return <LoadFailed onRetry={() => void mine.refetch()} />
  }
  if (!mine.data) return <PagePending />

  const booking = mine.data.bookings.find((b) => b.id === bookingId)
  if (!booking) {
    return (
      <main className={styles.page}>
        <Typography variant="h3" component="h1">
          {t('booking.notMine')}
        </Typography>
        <a href={`/book/${slug}`}>{t('booking.toBooking')}</a>
      </main>
    )
  }

  const { timeZone } = business.data
  const when = [
    dateTimeIn(new Date(booking.startsAt), timeZone, i18n.language),
    timeIn(new Date(booking.endsAt), timeZone),
  ].join('–')

  return (
    <main className={styles.page}>
      <Typography variant="h3" component="h1">
        {business.data.name}
      </Typography>
      <Typography variant="t2" color="grey-500">
        {[when, booking.title, booking.staffName].filter(Boolean).join(' · ')}
      </Typography>
      <Typography variant="t2">
        {t(`booking.manageStatus.${booking.status}`)}
      </Typography>
      {booking.canChange &&
        (moving ? (
          <MoveBooking
            slug={slug}
            booking={booking}
            onMove={(data) => move.mutateAsync({ slug, id: booking.id, data })}
            isPending={move.isPending}
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
            <CancelBooking
              onCancel={() => cancel.mutateAsync({ slug, id: booking.id })}
              isPending={cancel.isPending}
            />
          </>
        ))}
    </main>
  )
}
