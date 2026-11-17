import { type RefObject, useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from 'ted-ui/Modal'
import { Typography } from 'ted-ui/Typography'

import { useAppointmentsControllerCreate } from '@/api/appointments/appointments'
import type {
  AppointmentsControllerList200Item as Appointment,
  SlotsControllerSlots200Item as Slot,
} from '@/api/generated.schemas'
import { ApiError } from '@/apiFetch'
import { dateTimeIn, timeIn } from '@/dates'
import { ClientFields } from './ClientFields'
import styles from './Calendar.module.scss'
import { useClientForm } from './useClientForm'

// A group meeting or a one-off session: who has a seat in it, and a form to
// add one more. A meeting that is over, or full, only shows its bookings.
// The dialog stays open after an add: `onChanged` reloads the grid under it.
export function SessionModal({
  businessId,
  timeZone,
  meeting,
  ended,
  finalFocus,
  onChanged,
  onClose,
}: {
  businessId: string
  timeZone: string
  meeting: { slot: Slot; bookings: Appointment[] }
  ended: boolean
  finalFocus: RefObject<HTMLElement | null>
  onChanged: () => void
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const formId = useId()
  const { form, clientOf } = useClientForm()
  const create = useAppointmentsControllerCreate({
    mutation: { onSettled: onChanged },
  })
  const { slot, bookings } = meeting
  const open = !ended && !slot.full

  return (
    <Modal
      isVisible
      title={slot.title ?? t('calendar.meeting')}
      subtitle={`${dateTimeIn(new Date(slot.startsAt), timeZone, i18n.language)}–${timeIn(new Date(slot.endsAt), timeZone)}`}
      onClose={onClose}
      finalFocus={finalFocus}
      buttons={[
        {
          variant: 'ghost',
          colorScheme: 'grey',
          children: t('calendar.session.close'),
          onClick: onClose,
        },
        ...(open
          ? [
              {
                variant: 'solid' as const,
                colorScheme: 'black' as const,
                type: 'submit' as const,
                form: formId,
                loading: create.isPending,
                children: t('calendar.session.add'),
              },
            ]
          : []),
      ]}
    >
      <Typography variant="t2">
        {t('calendar.session.free', {
          free: Math.max(slot.capacity - slot.booked, 0),
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
      {!open && (
        <Typography variant="t4" color="grey-500" role="status">
          {ended ? t('calendar.session.ended') : t('calendar.session.full')}
        </Typography>
      )}
      {open && (
        <form
          id={formId}
          className={styles.form}
          noValidate
          onSubmit={form.handleSubmit((values) => {
            const client = clientOf(values)
            if (!client) return
            create.mutate(
              {
                businessId,
                data: {
                  staffId: slot.staffId,
                  startsAt: slot.startsAt,
                  endsAt: slot.endsAt,
                  ...client,
                  ...(slot.groupId
                    ? { groupId: slot.groupId }
                    : slot.oneOffSessionId
                      ? { oneOffSessionId: slot.oneOffSessionId }
                      : {}),
                },
              },
              { onSuccess: () => form.reset() },
            )
          })}
        >
          <ClientFields form={form} />
          {create.isError && (
            <Typography variant="t4" color="red-300" role="alert">
              {create.error instanceof ApiError && create.error.status === 409
                ? t('calendar.session.filled')
                : t('calendar.new.saveFailed')}
            </Typography>
          )}
        </form>
      )}
    </Modal>
  )
}
