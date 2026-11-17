import type {
  AppointmentsControllerList200Item as Appointment,
  SlotsControllerSlots200Item as Slot,
} from '@/api/generated.schemas'

// A meeting as the grid item `${meetingId}@${startsAt}` names it (see
// `toColumns`): its slot, and the seats booked in it. A cancelled booking
// holds no seat. Undefined for an item that is a booking, or a meeting that
// is no longer in the loaded range.
export function meetingOf(
  itemId: string,
  slots: Slot[],
  appointments: Appointment[],
) {
  const slot = slots.find(
    (s) => `${s.groupId ?? s.oneOffSessionId}@${s.startsAt}` === itemId,
  )
  if (!slot) return undefined
  const bookings = appointments.filter(
    (a) =>
      a.status !== 'CANCELLED' &&
      a.startsAt === slot.startsAt &&
      (slot.groupId
        ? a.groupId === slot.groupId
        : a.oneOffSessionId === slot.oneOffSessionId),
  )
  return { slot, bookings }
}
