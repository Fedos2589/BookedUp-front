import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  getPublicBookingControllerManagedQueryKey,
  usePublicBookingControllerMove,
} from '@/api/public-booking/public-booking'
import { PagePending } from '@/pages/PagePending'
import { refusalOf } from './bookRefusal'
import { LoadFailed } from './LoadFailed'
import { slotOfKey } from './slotsForPicker'
import { TimeStep } from './TimeStep'
import { useBookingData } from './useBookingData'

type Props = {
  token: string
  slug: string
  staffId: string
  onMoved: () => void
}

// «Change time»: the times of the booking's own master (a move never goes to
// «any»), then PATCH. A time taken meanwhile is said so and the times are
// refetched; any other refusal (the booking has started) is answered by asking
// for the booking again, which then shows read-only.
export function MoveBooking({ token, slug, staffId, onMoved }: Props) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { business, slots, today } = useBookingData(slug)
  const move = usePublicBookingControllerMove()
  const [choice, setChoice] = useState<{ day?: string; slot?: string }>({})
  const [taken, setTaken] = useState(false)

  if ((business.isError && !business.data) || (slots.isError && !slots.data)) {
    return (
      <LoadFailed
        onRetry={() => {
          if (business.isError) void business.refetch()
          if (slots.isError) void slots.refetch()
        }}
      />
    )
  }
  if (!business.data || !slots.data) return <PagePending />

  return (
    <TimeStep
      business={business.data}
      slots={slots.data}
      today={today}
      staff={staffId}
      day={choice.day}
      slot={choice.slot}
      taken={taken}
      actionLabel={t('booking.move')}
      onChange={(next) => {
        setTaken(false)
        setChoice(next)
      }}
      onContinue={() => {
        if (!choice.slot) return
        const { startsAt, endsAt, groupId, oneOffSessionId } = slotOfKey(
          choice.slot,
        )
        move.mutate(
          {
            token,
            data: { staffId, startsAt, endsAt, groupId, oneOffSessionId },
          },
          {
            onSuccess: () => {
              onMoved()
              void invalidateBooking()
            },
            onError: (error) => {
              if (refusalOf(error).kind === 'taken') {
                setTaken(true)
                void slots.refetch()
              } else {
                void invalidateBooking()
              }
            },
          },
        )
      }}
    />
  )

  function invalidateBooking() {
    return queryClient.invalidateQueries({
      queryKey: getPublicBookingControllerManagedQueryKey(token),
    })
  }
}
