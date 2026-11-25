import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Spinner } from 'ted-ui/Spinner/Spinner'
import { Typography } from 'ted-ui/Typography'

import type {
  PublicBookingControllerManaged200Booking,
  PublicBookingControllerMoveBody,
} from '@/api/generated.schemas'
import styles from './BookingPage.module.scss'
import { changeFailureKey, refusalOf } from './bookRefusal'
import { movableSlots } from './movableSlots'
import { slotOfKey } from './slotsForPicker'
import { TimeStep } from './TimeStep'
import { useBookingData } from './useBookingData'

type Props = {
  slug: string
  booking: PublicBookingControllerManaged200Booking
  // Moves the booking; rejects with the refusal. The parent owns the mutation
  // (and what is refetched after it, and leaving this screen on success).
  onMove: (data: PublicBookingControllerMoveBody) => Promise<unknown>
  isPending: boolean
  onBack: () => void
}

// «Change time»: the times of the booking's own master and kind (a move never
// goes to «any» or from hours to a group), then onMove. A time taken meanwhile is said so and the times are
// refetched; any other refusal is said too. Inside the page's own <main>.
export function MoveBooking({
  slug,
  booking,
  onMove,
  isPending,
  onBack,
}: Props) {
  const { t } = useTranslation()
  const { business, slots, today } = useBookingData(slug)
  const [choice, setChoice] = useState<{ day?: string; slot?: string }>({})
  const [taken, setTaken] = useState(false)
  const [error, setError] = useState<unknown>()

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
        actionLoading={isPending}
        failure={
          error !== undefined && !taken ? t(changeFailureKey(error)) : undefined
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
          setError(undefined)
          onMove({
            staffId: booking.staffId,
            startsAt,
            endsAt,
            groupId,
            oneOffSessionId,
          }).catch((failure: unknown) => {
            if (refusalOf(failure).kind === 'taken') {
              setTaken(true)
              void slots.refetch()
            } else setError(failure)
          })
        }}
      />
      {back}
    </>
  )
}
