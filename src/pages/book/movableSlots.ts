import type { PublicBookingControllerSlots200Item as Slot } from '@/api/generated.schemas'

type Booking = Pick<Slot, 'startsAt' | 'endsAt' | 'groupId' | 'oneOffSessionId'>

// What a booking may be moved to: another time of the same kind. An hours
// booking stays among hours, a group booking among its own group's times, a
// one-off booking among one-off sessions; never its own time.
export function movableSlots(slots: Slot[], booking: Booking): Slot[] {
  const sameKind = (slot: Slot) =>
    booking.groupId
      ? slot.groupId === booking.groupId
      : booking.oneOffSessionId
        ? slot.oneOffSessionId !== null
        : slot.groupId === null && slot.oneOffSessionId === null
  const own = (slot: Slot) =>
    slot.startsAt === booking.startsAt && slot.endsAt === booking.endsAt
  return slots.filter((slot) => sameKind(slot) && !own(slot))
}
