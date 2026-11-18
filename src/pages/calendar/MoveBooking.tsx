import { type RefObject, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Combobox } from 'ted-ui/Combobox'
import { DatePicker } from 'ted-ui/DatePicker'
import { Modal } from 'ted-ui/Modal'
import { Typography } from 'ted-ui/Typography'

import { useAppointmentsControllerMove } from '@/api/appointments/appointments'
import type {
  AppointmentsControllerList200Item as Appointment,
  SlotsControllerSlots200Item as Slot,
  StaffControllerList200Item,
} from '@/api/generated.schemas'
import { useSlotsControllerSlots } from '@/api/schedule/schedule'
import { ApiError } from '@/apiFetch'
import { dateIn } from '@/dates'
import { useNow } from '@/useNow'
import { useUnsavedInput } from '@/pwa/unsavedInput'
import { freeHoursSlots, slotKey, slotRange } from './newBooking'
import styles from './Calendar.module.scss'

// Moves a booking to another free hour: a day, then one of the free hours of
// the masters on screen that day (a slot names its master, so a master is
// chosen with the hour). A time taken meanwhile keeps the dialog and reloads
// the hours; `onChanged` reloads the grid under it.
export function MoveBooking({
  businessId,
  timeZone,
  booking,
  masters,
  finalFocus,
  onChanged,
  onBack,
  onClose,
}: {
  businessId: string
  timeZone: string
  booking: Appointment
  masters: StaffControllerList200Item[]
  finalFocus: RefObject<HTMLElement | null>
  onChanged: () => void
  onBack: () => void
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const formId = useId()
  const now = useNow()
  // As CalendarPage: a zone this browser does not know falls back to UTC.
  const today = dateIn(now, timeZone) ?? dateIn(now, 'UTC')!
  const own = dateIn(new Date(booking.startsAt), timeZone) ?? today
  const initial = own < today ? today : own
  const [date, setDate] = useState(initial)
  const [chosen, setChosen] = useState<string>()
  const loaded = useSlotsControllerSlots(businessId, { from: date, to: date })
  const move = useAppointmentsControllerMove({
    mutation: {
      onSettled: () => {
        onChanged()
        void loaded.refetch()
      },
    },
  })
  const onScreen = new Set(masters.map((m) => m.id))
  const slots = freeHoursSlots(loaded.data ?? [], now).filter((s) =>
    onScreen.has(s.staffId),
  )
  // Until the person chooses, the booking's own master comes first. Once an
  // hour is chosen it is found by key in the current list: one taken meanwhile
  // leaves it and nothing is chosen, rather than another hour sent in its place.
  const slot =
    chosen === undefined
      ? (slots.find((s) => s.staffId === booking.staffId) ?? slots[0])
      : slots.find((s) => slotKey(s) === chosen)

  useUnsavedInput(date !== initial || chosen !== undefined)

  const label = (s: Slot) =>
    `${masters.find((m) => m.id === s.staffId)?.name ?? ''} · ${slotRange(s, timeZone, i18n.language) ?? ''}`

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
          onClick: onBack,
        },
        {
          variant: 'solid',
          colorScheme: 'black',
          type: 'submit',
          form: formId,
          loading: move.isPending,
          disabled: !slot,
          children: t('calendar.move.submit'),
        },
      ]}
    >
      <form
        id={formId}
        className={styles.form}
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          if (!slot) return
          setChosen(slotKey(slot))
          move.mutate(
            {
              businessId,
              appointmentId: booking.id,
              data: {
                staffId: slot.staffId,
                startsAt: slot.startsAt,
                endsAt: slot.endsAt,
              },
            },
            { onSuccess: onClose },
          )
        }}
      >
        <DatePicker
          mode="single"
          label={t('calendar.move.date')}
          value={date}
          minDate={today}
          onChange={(next) => {
            setDate(next || initial)
            setChosen(undefined)
          }}
        />
        <Combobox
          label={t('calendar.new.slot')}
          options={slots}
          value={slot ?? null}
          onValueChange={(next) => next && setChosen(slotKey(next))}
          itemToStringLabel={label}
          isItemEqualToValue={(a, b) =>
            a.startsAt === b.startsAt && a.staffId === b.staffId
          }
          getItemKey={slotKey}
          openOnFocus
        />
        {loaded.data && slots.length === 0 && (
          <Typography variant="t4" color="grey-500" role="status">
            {t('calendar.new.noFree')}
          </Typography>
        )}
        {move.isError && (
          <Typography variant="t4" color="red-300" role="alert">
            {move.error instanceof ApiError && move.error.status === 409
              ? t('calendar.new.notFree')
              : t('calendar.move.failed')}
          </Typography>
        )}
      </form>
    </Modal>
  )
}
