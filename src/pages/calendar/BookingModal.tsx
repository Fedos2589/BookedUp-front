import { type RefObject, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from 'ted-ui/ConfirmDialog'
import { Modal } from 'ted-ui/Modal'
import { Typography } from 'ted-ui/Typography'

import { useAppointmentsControllerChangeStatus } from '@/api/appointments/appointments'
import type {
  AppointmentsControllerChangeStatusBodyStatus as Status,
  AppointmentsControllerList200Item as Appointment,
  StaffControllerList200Item,
} from '@/api/generated.schemas'
import { ApiError } from '@/apiFetch'
import { slotRange } from './newBooking'
import { MoveBooking } from './MoveBooking'
import { canMove, statusMoves } from './statusMoves'

// One booking of the hours: who, when, in what status, and the moves the back
// allows from it. A cancel asks first. `onChanged` reloads the grid under the
// dialog, slots too — a no-show or a cancel frees the master's time.
export function BookingModal({
  businessId,
  timeZone,
  booking,
  masters,
  started,
  finalFocus,
  onChanged,
  onClose,
}: {
  businessId: string
  timeZone: string
  booking: Appointment
  masters: StaffControllerList200Item[]
  started: boolean
  finalFocus: RefObject<HTMLElement | null>
  onChanged: () => void
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const [cancelling, setCancelling] = useState(false)
  const [moving, setMoving] = useState(false)
  const change = useAppointmentsControllerChangeStatus({
    mutation: { onSettled: onChanged },
  })
  const moveTo = (status: Status, then?: () => void) =>
    change.mutate(
      { businessId, appointmentId: booking.id, data: { status } },
      { onSuccess: then },
    )
  const moves = statusMoves(booking.status, started)
  const refused =
    change.error instanceof ApiError && change.error.status === 409
  // Shown in whichever dialog is open: the question of a cancel fails too.
  const failure = change.isError && (
    <Typography variant="t4" color="red-300" role="alert">
      {refused ? t('calendar.booking.changed') : t('calendar.booking.failed')}
    </Typography>
  )

  if (moving) {
    return (
      <MoveBooking
        businessId={businessId}
        timeZone={timeZone}
        booking={booking}
        masters={masters}
        finalFocus={finalFocus}
        onChanged={onChanged}
        onBack={() => setMoving(false)}
        onClose={onClose}
      />
    )
  }

  if (cancelling) {
    return (
      <ConfirmDialog
        isVisible
        colorScheme="red"
        title={t('calendar.booking.cancelTitle')}
        confirmLabel={t('calendar.booking.cancelConfirm')}
        cancelLabel={t('calendar.booking.keep')}
        loading={change.isPending}
        finalFocus={finalFocus}
        onClose={() => setCancelling(false)}
        onConfirm={() => moveTo('CANCELLED', onClose)}
      >
        {booking.clientName}
        {failure}
      </ConfirmDialog>
    )
  }

  return (
    <Modal
      isVisible
      title={t('calendar.booking.title')}
      subtitle={slotRange(booking, timeZone, i18n.language)}
      onClose={onClose}
      finalFocus={finalFocus}
      buttons={[
        {
          variant: 'ghost',
          colorScheme: 'grey',
          children: t('calendar.booking.close'),
          onClick: onClose,
        },
        ...(canMove(booking.status)
          ? [
              {
                variant: 'ghost' as const,
                colorScheme: 'black' as const,
                children: t('calendar.booking.moveAction'),
                disabled: change.isPending,
                onClick: () => setMoving(true),
              },
            ]
          : []),
        ...moves.map((status) =>
          status === 'CANCELLED'
            ? {
                variant: 'ghost' as const,
                colorScheme: 'red' as const,
                children: t('calendar.booking.move.CANCELLED'),
                disabled: change.isPending,
                onClick: () => setCancelling(true),
              }
            : {
                variant: 'solid' as const,
                colorScheme: 'black' as const,
                loading:
                  change.isPending && change.variables?.data.status === status,
                disabled: change.isPending,
                children: t(`calendar.booking.move.${status}`),
                onClick: () => moveTo(status),
              },
        ),
      ]}
    >
      <Typography variant="t1">{booking.clientName}</Typography>
      <Typography variant="t2">
        <a href={`tel:${booking.clientPhone}`}>{booking.clientPhone}</a>
      </Typography>
      {booking.note && (
        <Typography variant="t3" color="grey-500">
          {t('calendar.booking.note')}: {booking.note}
        </Typography>
      )}
      <Typography variant="t2" role="status">
        {t(`calendar.booking.status.${booking.status}`)}
      </Typography>
      {failure}
    </Modal>
  )
}
