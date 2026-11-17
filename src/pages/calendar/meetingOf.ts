import type {
  AppointmentsControllerList200Item as Appointment,
  SlotsControllerSlots200Item as Slot,
} from '@/api/generated.schemas'
import { dateIn } from '@/dates'

// The id of a meeting's item in the grid; `meetingOf` finds the meeting by it.
export const meetingItemId = (s: Slot) =>
  `${s.groupId ?? s.oneOffSessionId}@${s.startsAt}`

// A meeting as its grid item names it: its slot, and the seats booked in it.
// A cancelled booking holds no seat. Undefined for an item that is a booking,
// or a meeting that is no longer in the loaded range.
export function meetingOf(
  itemId: string,
  slots: Slot[],
  appointments: Appointment[],
) {
  const slot = slots.find((s) => meetingItemId(s) === itemId)
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

// What can be added to a meeting now, as the back allows it: a seat while it is
// ahead and not full; a walk-in (a client who came, over capacity if need be)
// once it has started, on its own day; nothing otherwise.
export function joinMode(slot: Slot, now: Date, timeZone: string) {
  if (new Date(slot.startsAt) > now) return slot.full ? 'closed' : 'seat'
  const today = dateIn(now, timeZone)
  return today && today === dateIn(new Date(slot.startsAt), timeZone)
    ? 'walkIn'
    : 'closed'
}
