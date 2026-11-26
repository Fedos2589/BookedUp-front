import { useQueryClient } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { useEffect, useEffectEvent, useState } from 'react'
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
import { ApiError } from '@/apiFetch'
import { dateTimeIn, timeIn } from '@/dates'
import { PagePending } from '@/pages/PagePending'
import styles from './BookingPage.module.scss'
import { refusalOf } from './bookRefusal'
import { CancelBooking } from './CancelBooking'
import { ConfirmPhone } from './ConfirmPhone'
import { LoadFailed } from './LoadFailed'
import { MoveBooking } from './MoveBooking'
import { NoSuchPage } from './NoSuchPage'
import { OnlineBookingOff } from './OnlineBookingOff'
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
  // The session ended meanwhile (another tab, the cookie's term): ask for it
  // again, the phone is then gone and the page asks to confirm it.
  const lostSession = (error: unknown) => {
    if (refusalOf(error).kind === 'signIn') void session.refresh()
  }
  const cancel = usePublicBookingControllerCancelMine({
    mutation: { onSettled: invalidate, onError: lostSession },
  })
  const move = usePublicBookingControllerMoveMine({
    mutation: {
      onSuccess: () => setMoving(false),
      onSettled: invalidate,
      onError: lostSession,
    },
  })
  const listFailed = useEffectEvent(lostSession)
  useEffect(() => {
    if (mine.error) listFailed(mine.error)
  }, [mine.error])
  useBusinessManifest(slug, business.data?.name)

  if (business.error instanceof ApiError && business.error.status === 404) {
    return <NoSuchPage />
  }
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
        {business.data.clientSignIn ? (
          <ConfirmPhone
            onConfirmed={async () => {
              const { data } = await session.refresh()
              return Boolean(data?.phone)
            }}
          />
        ) : (
          <OnlineBookingOff />
        )}
      </main>
    )
  }
  // The session is being asked for again (its end is the list's 401).
  if (mine.isError && refusalOf(mine.error).kind === 'signIn')
    return <PagePending />
  if (mine.isError && !mine.data) {
    return <LoadFailed onRetry={() => void mine.refetch()} />
  }
  if (!mine.data) return <PagePending />

  // A cancelled booking is no longer in the list: its own answer is shown.
  const booking =
    mine.data.bookings.find((b) => b.id === bookingId) ??
    (cancel.data?.id === bookingId ? cancel.data : undefined)
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
