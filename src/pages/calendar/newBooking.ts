import { type CountryCode, parsePhoneNumberFromString } from 'libphonenumber-js'

import type { SlotsControllerSlots200Item } from '@/api/generated.schemas'
import { ApiError } from '@/apiFetch'
import { dateTimeIn, localMoment, timeIn } from '@/dates'

type Slot = SlotsControllerSlots200Item

export const slotKey = (s: Slot) => `${s.staffId}@${s.startsAt}`

// Free time of a master that is still ahead, as opposed to a meeting (a group
// or a one-off session). The grid also loads the past, which cannot be booked.
export const freeHoursSlots = (slots: Slot[], now: Date) =>
  slots.filter(
    (s) => !s.groupId && !s.oneOffSessionId && new Date(s.startsAt) >= now,
  )

// What can be booked now: free hours ahead of now, of a master that has a
// column on screen.
export function freeSlotsOf(
  slots: Slot[],
  masters: { id: string }[],
  now: Date,
) {
  const onScreen = new Set(masters.map((m) => m.id))
  return freeHoursSlots(slots, now).filter((s) => onScreen.has(s.staffId))
}

// The slot a person chose, found by key in the current list: one taken
// meanwhile has left it, so nothing is chosen — not another slot in its place.
export const chosenSlot = (slots: Slot[], key: string | undefined) =>
  slots.find((s) => slotKey(s) === key)

// The free hours under a click on empty space: the master's column and the
// minute on the business's clock, the end not included.
export function slotAt(
  free: Slot[],
  staffId: string,
  date: string,
  minute: number,
  timeZone: string,
) {
  return free.find((s) => {
    const start = localMoment(s.startsAt, timeZone)
    const end = localMoment(s.endsAt, timeZone)
    if (s.staffId !== staffId || start?.date !== date || !end) return false
    const endMinute = end.date === date ? end.minute : 1440
    return minute >= start.minute && minute < endMinute
  })
}

// What the back takes as a phone (+E.164), from what the field holds; undefined
// while the number is not a whole one.
export function clientPhone(country: CountryCode, nationalNumber: string) {
  const phone = parsePhoneNumberFromString(nationalNumber, country)
  return phone?.isValid() ? phone.number : undefined
}

// "Nov 19, 10:00–11:00" on the business's clock; undefined for a zone this
// browser does not know (shown without a time rather than as "undefined").
export function slotRange(
  slot: { startsAt: string; endsAt: string },
  timeZone: string,
  language: string,
) {
  const start = dateTimeIn(new Date(slot.startsAt), timeZone, language)
  const end = timeIn(new Date(slot.endsAt), timeZone)
  return start && end ? `${start}–${end}` : undefined
}

// The back's answer to a refused request: its 409 `code`, if it had one.
export const conflictCode = (error: unknown) =>
  error instanceof ApiError && error.status === 409
    ? (error.body as { code?: string } | undefined)?.code
    : undefined

// The text of a refusal that belongs to the client picker (a phone that became
// someone's, a guardian who is a dependent), as a locale key; undefined for any
// other.
export function clientRefusalKey(error: unknown) {
  const code = conflictCode(error)
  if (code === 'phoneTaken') return 'validation.phoneTaken' as const
  if (code === 'notHolder') return 'clients.form.notHolder' as const
  return undefined
}
