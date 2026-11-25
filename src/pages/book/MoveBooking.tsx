import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Spinner } from 'ted-ui/Spinner/Spinner'
import { Typography } from 'ted-ui/Typography'

import type { PublicBookingControllerManaged200Booking } from '@/api/generated.schemas'
import {
  getPublicBookingControllerManagedQueryKey,
  usePublicBookingControllerMove,
} from '@/api/public-booking/public-booking'
import styles from './BookingPage.module.scss'
import { changeFailureKey, refusalOf } from './bookRefusal'
import { movableSlots } from './movableSlots'
import { slotOfKey } from './slotsForPicker'
import { TimeStep } from './TimeStep'
import { useBookingData } from './useBookingData'

type Props = {
  token: string
  slug: string
  booking: PublicBookingControllerManaged200Booking
  onMoved: () => void
  onBack: () => void
}

// «Change time»: the times of the booking's own master and kind (a move never
// goes to «any» or from hours to a group), then PATCH. A time taken meanwhile is said so and the times are
// refetched; any other refusal is said too, and the booking is asked for again
// (if it has started it now shows read-only). Inside the page's own <main>.
export function MoveBooking({ token, slug, booking, onMoved, onBack }: Props) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { business, slots, today } = useBookingData(slug)
  const [choice, setChoice] = useState<{ day?: string; slot?: string }>({})
  const [taken, setTaken] = useState(false)
  // The page's callbacks sit on the hook, not on mutate(): they still run if
  // the client has gone back by the time the back answers.
  const move = usePublicBookingControllerMove({
    mutation: {
      onSuccess: () => {
        onMoved()
        void invalidateBooking()
      },
      onError: (error) => {
        if (refusalOf(error).kind === 'taken') {
          setTaken(true)
          void slots.refetch()
        } else void invalidateBooking()
      },
    },
  })

  const invalidateBooking = () =>
    queryClient.invalidateQueries({
      queryKey: getPublicBookingControllerManagedQueryKey(token),
    })

  const back = (
    <Button
      variant="ghost"
      colorScheme="grey"
      className={styles.retry}
      onClick={onBack}
    >
      {t('booking.back')}
    </Button>
  )

  if ((business.isError && !business.data) || (slots.isError && !slots.data)) {
    return (
      <>
        <Typography variant="t2" role="alert">
          {t('booking.loadFailed')}
        </Typography>
        <Button
          variant="solid"
          colorScheme="black"
          className={styles.retry}
          onClick={() => {
            if (business.isError) void business.refetch()
            if (slots.isError) void slots.refetch()
          }}
        >
          {t('common.tryAgain')}
        </Button>
        {back}
      </>
    )
  }
  if (!business.data || !slots.data)
    return <Spinner size="large" aria-label={t('common.loading')} />

  return (
    <>
      <TimeStep
        business={business.data}
        slots={movableSlots(slots.data, booking)}
        today={today}
        staff={booking.staffId}
        day={choice.day}
        slot={choice.slot}
        taken={taken}
        actionLabel={t('booking.move')}
        actionLoading={move.isPending}
        failure={
          move.isError && !taken ? t(changeFailureKey(move.error)) : undefined
        }
        onChange={(next) => {
          setTaken(false)
          setChoice(next)
        }}
        onContinue={() => {
          if (!choice.slot) return
          const { startsAt, endsAt, groupId, oneOffSessionId } = slotOfKey(
            choice.slot,
          )
          move.mutate({
            token,
            data: {
              staffId: booking.staffId,
              startsAt,
              endsAt,
              groupId,
              oneOffSessionId,
            },
          })
        }}
      />
      {back}
    </>
  )
}
