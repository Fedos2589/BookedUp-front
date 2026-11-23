import type {
  PublicBookingControllerBusiness200MastersItem as Master,
  PublicBookingControllerSlots200Item as Slot,
} from '@/api/generated.schemas'

// "Any free master" is offered when an hours master has a free hours time: a
// group meeting has its own master. One rule for step 1's list and for an
// address that asks for "any".
export function anyMasterOffered(masters: Master[], slots: Slot[]): boolean {
  const hoursMasters = new Set(
    masters
      .filter((master) => master.scheduleMode === 'HOURS')
      .map((master) => master.id),
  )
  return slots.some(
    (slot) =>
      !slot.full &&
      hoursMasters.has(slot.staffId) &&
      slot.groupId === null &&
      slot.oneOffSessionId === null,
  )
}
