import { type RefObject, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { MoveFields } from './MoveFields'
import { canMove, statusMoves } from './statusMoves'
import { useMoveBooking } from './useMoveBooking'

type Step = 'details' | 'move' | 'cancel'

// One booking of the hours: who, when, in what status, and the moves the back
// allows from it. One dialog for all of it — the details, the move and the
// question of a cancel are its steps, so focus stays put and «Back» from the
// move keeps the day and the hour. `onChanged` reloads the grid under the
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
  const formId = useId()
  const [step, setStep] = useState<Step>('details')
  const change = useAppointmentsControllerChangeStatus({
    mutation: { onSettled: onChanged },
  })
  const moving = useMoveBooking({
    businessId,
    timeZone,
    booking,
    masters,
    active: step === 'move',
    onChanged,
    onMoved: onClose,
  })
  const moveTo = (status: Status, then?: () => void) =>
    change.mutate(
      { businessId, appointmentId: booking.id, data: { status } },
      { onSuccess: then },
    )
  const moves = statusMoves(booking.status, started)
  const refused =
    change.error instanceof ApiError && change.error.status === 409
  // Shown on the details and on the question of a cancel: both can fail.
  const failure = change.isError && (
    <Typography variant="t4" color="red-300" role="alert">
      {refused ? t('calendar.booking.changed') : t('calendar.booking.failed')}
    </Typography>
  )

  if (step === 'move') {
    return (
      <Modal
        isVisible
        title={t('calendar.move.title')}
        subtitle={booking.clientName}
        onClose={onClose}
        finalFocus={finalFocus}
        buttons={[
          {
            variant: 'ghost',
            colorScheme: 'grey',
            children: t('calendar.move.back'),
            onClick: () => setStep('details'),
          },
          {
            variant: 'solid',
            colorScheme: 'black',
            type: 'submit',
            form: formId,
            loading: moving.move.isPending,
            disabled: !moving.slot,
            children: t('calendar.move.submit'),
          },
        ]}
      >
        <MoveFields
          formId={formId}
          state={moving}
          masters={masters}
          timeZone={timeZone}
        />
      </Modal>
    )
  }

  if (step === 'cancel') {
    return (
      <Modal
        isVisible
        role="alertdialog"
        title={t('calendar.booking.cancelTitle')}
        onClose={() => setStep('details')}
        finalFocus={finalFocus}
        buttons={[
          {
            variant: 'ghost',
            colorScheme: 'grey',
            children: t('calendar.booking.keep'),
            onClick: () => setStep('details'),
          },
          {
            variant: 'solid',
            colorScheme: 'red',
            loading: change.isPending,
            children: t('calendar.booking.cancelConfirm'),
            onClick: () => moveTo('CANCELLED', onClose),
          },
        ]}
      >
        <Typography variant="t1">{booking.clientName}</Typography>
        {failure}
      </Modal>
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
                onClick: () => setStep('move'),
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
                onClick: () => setStep('cancel'),
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
