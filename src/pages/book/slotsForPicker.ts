import type {
  PublicBookingControllerBusiness200MastersItem as Master,
  PublicBookingControllerSlots200Item as Slot,
} from '@/api/generated.schemas'
import { addDays, dateIn, isoWeekday, timeIn, weekdayLabel } from '@/dates'
import { ANY_MASTER } from './bookingSearch'

// How many days the booking page offers, today included.
export const DAYS_AHEAD = 14

// One button of the time list. `staffId` is empty for an "any master" time:
// booking it sends no master. `free` is only for a meeting (a seat count).
export type PickerSlot = {
  id: string
  time: string
  staffId: string
  title: string | null
  master: string | null
  free: { left: number; of: number } | null
  full: boolean
}

export type PickerDay = {
  date: string
  weekday: string
  number: string
  slots: PickerSlot[]
}

type Input = {
  slots: Slot[]
  staff: string
  timeZone: string
  masters: Master[]
  today: string
  language: string
}

const isMeeting = (slot: Slot) =>
  slot.groupId !== null || slot.oneOffSessionId !== null

// The slot's identity in the address: master (empty for "any"), start, end,
// group and one-off session.
const keyOf = (staffId: string, slot: Slot) =>
  [
    staffId,
    slot.startsAt,
    slot.endsAt,
    slot.groupId ?? '',
    slot.oneOffSessionId ?? '',
  ].join('|')

// What a key from keyOf names, for the booking request.
export function slotOfKey(key: string) {
  const [staffId, startsAt, endsAt, groupId, oneOffSessionId] = key.split('|')
  return {
    staffId: staffId || undefined,
    startsAt,
    endsAt,
    groupId: groupId || undefined,
    oneOffSessionId: oneOffSessionId || undefined,
  }
}

const dayOf = (slot: Slot, timeZone: string) =>
  dateIn(new Date(slot.startsAt), timeZone) ?? slot.startsAt.slice(0, 10)

const timeOf = (slot: Slot, timeZone: string) =>
  timeIn(new Date(slot.startsAt), timeZone) ?? slot.startsAt.slice(11, 16)

function pickerSlot(
  slot: Slot,
  staffId: string,
  timeZone: string,
  // Set for "any", where the meeting's master is not yet known to the client.
  masters: Master[] | null,
): PickerSlot {
  const meeting = isMeeting(slot)
  return {
    id: keyOf(staffId, slot),
    time: timeOf(slot, timeZone),
    staffId,
    title: meeting ? slot.title : null,
    master:
      meeting && masters
        ? (masters.find((master) => master.id === slot.staffId)?.name ?? null)
        : null,
    free: meeting
      ? { left: Math.max(slot.capacity - slot.booked, 0), of: slot.capacity }
      : null,
    full: slot.full,
  }
}

// The times the picker offers for the chosen master, or for "any": a master's
// own hours and meetings, full ones shown but disabled; for "any" the free
// hours of all masters merged by start and end (one button each), and every
// free meeting on its own. Days and times are the business's, not the browser's.
export function slotsForPicker({
  slots,
  staff,
  timeZone,
  masters,
  today,
  language,
}: Input): PickerDay[] {
  const any = staff === ANY_MASTER
  const seen = new Set<string>()
  const byDay = new Map<string, PickerSlot[]>()

  for (const slot of [...slots].sort((a, b) =>
    a.startsAt.localeCompare(b.startsAt),
  )) {
    if (!any && slot.staffId !== staff) continue
    if (any && slot.full) continue
    // "Any" books no master: its hours times carry none.
    const staffId = any && !isMeeting(slot) ? '' : slot.staffId
    const picked = pickerSlot(slot, staffId, timeZone, any ? masters : null)
    if (seen.has(picked.id)) continue
    seen.add(picked.id)
    const date = dayOf(slot, timeZone)
    byDay.set(date, [...(byDay.get(date) ?? []), picked])
  }

  return Array.from({ length: DAYS_AHEAD }, (_, index) => {
    const date = addDays(today, index)
    return {
      date,
      weekday: weekdayLabel(isoWeekday(date), language),
      number: String(Number(date.slice(8))),
      slots: byDay.get(date) ?? [],
    }
  })
}
