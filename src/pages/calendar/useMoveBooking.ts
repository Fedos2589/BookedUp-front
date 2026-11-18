import { useState } from 'react'

import { useAppointmentsControllerMove } from '@/api/appointments/appointments'
import type {
  AppointmentsControllerList200Item as Appointment,
  StaffControllerList200Item,
} from '@/api/generated.schemas'
import { useSlotsControllerSlots } from '@/api/schedule/schedule'
import { dateIn } from '@/dates'
import { useUnsavedInput } from '@/pwa/unsavedInput'
import { useNow } from '@/useNow'
import { chosenSlot, freeSlotsOf, slotKey } from './newBooking'

// The state of moving a booking: a day, then one of the free hours of the
// masters on screen that day (a slot names its master, so a master is chosen
// with the hour). It lives above the dialog's steps, so «Back» from the move
// keeps the day and the hour. The hours load only while `active`. A time taken
// meanwhile keeps the dialog and reloads the hours; `onChanged` reloads the
// grid under it.
export function useMoveBooking({
  businessId,
  timeZone,
  booking,
  masters,
  active,
  onChanged,
  onMoved,
}: {
  businessId: string
  timeZone: string
  booking: Appointment
  masters: StaffControllerList200Item[]
  active: boolean
  onChanged: () => void
  onMoved: () => void
}) {
  const now = useNow()
  // As CalendarPage: a zone this browser does not know falls back to UTC.
  const today = dateIn(now, timeZone) ?? dateIn(now, 'UTC')!
  const own = dateIn(new Date(booking.startsAt), timeZone) ?? today
  const initial = own < today ? today : own
  const [date, setDate] = useState(initial)
  const [chosen, setChosen] = useState<string>()
  const loaded = useSlotsControllerSlots(
    businessId,
    { from: date, to: date },
    { query: { enabled: active } },
  )
  const move = useAppointmentsControllerMove({
    mutation: {
      onSettled: () => {
        onChanged()
        void loaded.refetch()
      },
    },
  })
  const slots = freeSlotsOf(loaded.data ?? [], masters, now)
  // Until the person chooses, the booking's own master comes first. Once an
  // hour is chosen it is found by key in the current list: one taken meanwhile
  // leaves it and nothing is chosen, rather than another hour sent in its place.
  const slot =
    chosen === undefined
      ? (slots.find((s) => s.staffId === booking.staffId) ?? slots[0])
      : chosenSlot(slots, chosen)

  useUnsavedInput(active && (date !== initial || chosen !== undefined))

  return {
    today,
    date,
    slots,
    slot,
    pending: !loaded.data,
    move,
    chooseDate: (next: string) => {
      setDate(next || initial)
      setChosen(undefined)
    },
    choose: (next: Parameters<typeof slotKey>[0]) => setChosen(slotKey(next)),
    submit: () => {
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
        { onSuccess: onMoved },
      )
    },
  }
}
