import { type RefObject, useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from 'ted-ui/Modal'
import { Typography } from 'ted-ui/Typography'

import {
  useAppointmentsControllerCreate,
  useAppointmentsControllerWalkIn,
} from '@/api/appointments/appointments'
import type {
  AppointmentsControllerList200Item as Appointment,
  SlotsControllerSlots200Item as Slot,
} from '@/api/generated.schemas'
import { BookingClientFields } from './BookingClientFields'
import type { joinMode } from './meetingOf'
import { clientRefusalKey, conflictCode, slotRange } from './newBooking'
import styles from './Calendar.module.scss'
import { useBookingClient } from './useBookingClient'

// A group meeting or a one-off session: who has a seat in it, and a form to
// add one more — a seat while it is ahead, a walk-in once it has started. A
// meeting that takes no one shows only its bookings and why. The dialog stays
// open after an add: `onChanged` reloads the grid under it.
export function SessionModal({
  businessId,
  timeZone,
  meeting,
  mode,
  ended,
  finalFocus,
  onChanged,
  onClose,
}: {
  businessId: string
  timeZone: string
  meeting: { slot: Slot; bookings: Appointment[] }
  mode: ReturnType<typeof joinMode>
  ended: boolean
  finalFocus: RefObject<HTMLElement | null>
  onChanged: () => void
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const formId = useId()
  const booking = useBookingClient()
  const seat = useAppointmentsControllerCreate({
    mutation: { onSettled: onChanged },
  })
  const walkIn = useAppointmentsControllerWalkIn({
    mutation: { onSettled: onChanged },
  })
  const add = mode === 'walkIn' ? walkIn : seat
  const { slot, bookings } = meeting
  const refusal = (code?: string) =>
    code === 'full'
      ? t('calendar.session.filled')
      : code === 'notStarted'
        ? t('calendar.session.notStarted')
        : code === 'notFree'
          ? t('calendar.session.changed')
          : t('calendar.new.saveFailed')
  const over = Math.max(slot.booked - slot.capacity, 0)

  return (
    <Modal
      isVisible
      title={slot.title ?? t('calendar.meeting')}
      subtitle={slotRange(slot, timeZone, i18n.language)}
      onClose={onClose}
      finalFocus={finalFocus}
      buttons={[
        {
          variant: 'ghost',
          colorScheme: 'grey',
          children: t('calendar.session.close'),
          onClick: onClose,
        },
        ...(mode === 'closed'
          ? []
          : [
              {
                variant: 'solid' as const,
                colorScheme: 'black' as const,
                type: 'submit' as const,
                form: formId,
                loading: add.isPending,
                disabled: !booking.client,
                children: t(
                  mode === 'walkIn'
                    ? 'calendar.session.walkIn'
                    : 'calendar.session.add',
                ),
              },
            ]),
      ]}
    >
      <Typography variant="t2">
        {over > 0
          ? t('calendar.session.over', { capacity: slot.capacity, over })
          : t('calendar.session.free', {
              free: slot.capacity - slot.booked,
              capacity: slot.capacity,
            })}
      </Typography>
      {bookings.length === 0 ? (
        <Typography variant="t4" color="grey-500">
          {t('calendar.session.none')}
        </Typography>
      ) : (
        <ul className={styles.seats} aria-label={t('calendar.session.list')}>
          {bookings.map((b) => (
            <li key={b.id}>
              <Typography variant="t2">{b.clientName}</Typography>{' '}
              <Typography variant="t4" color="grey-500">
                {b.clientPhone}
              </Typography>
            </li>
          ))}
        </ul>
      )}
      {mode === 'closed' ? (
        <Typography variant="t4" color="grey-500" role="status">
          {t(ended ? 'calendar.session.ended' : 'calendar.session.full')}
        </Typography>
      ) : (
        <form
          id={formId}
          className={styles.form}
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            if (!booking.client) return
            const data = {
              staffId: slot.staffId,
              startsAt: slot.startsAt,
              endsAt: slot.endsAt,
              ...booking.client,
              ...(slot.groupId
                ? { groupId: slot.groupId }
                : slot.oneOffSessionId
                  ? { oneOffSessionId: slot.oneOffSessionId }
                  : {}),
            }
            const done = { onSuccess: booking.reset }
            if (mode === 'walkIn') walkIn.mutate({ businessId, data }, done)
            else seat.mutate({ businessId, data }, done)
          }}
        >
          <BookingClientFields state={booking} refused={add.error} />
          {add.isError && !clientRefusalKey(add.error) && (
            <Typography variant="t4" color="red-300" role="alert">
              {refusal(conflictCode(add.error))}
            </Typography>
          )}
        </form>
      )}
    </Modal>
  )
}
