import { type CountryCode, parsePhoneNumberFromString } from 'libphonenumber-js'
import { z } from 'zod'

import type { SlotsControllerSlots200Item } from '@/api/generated.schemas'
import { localMoment } from '@/dates'

type Slot = SlotsControllerSlots200Item

// Free time of a master, as opposed to a meeting (a group or a one-off session).
export const freeHoursSlots = (slots: Slot[]) =>
  slots.filter((s) => !s.groupId && !s.oneOffSessionId)

// The free hours under a click on empty space: the master's column and the
// minute on the business's clock, the end not included.
export function slotAt(
  slots: Slot[],
  staffId: string,
  date: string,
  minute: number,
  timeZone: string,
) {
  return freeHoursSlots(slots).find((s) => {
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

// The back's rules (appointments.schema.ts): a name of 1–100 characters, a
// note up to 2000. The phone must be a whole number of its country.
export const bookingSchema = z
  .object({
    clientName: z
      .string()
      .trim()
      .min(1, 'validation.required')
      .max(100, 'validation.tooLong'),
    country: z.custom<CountryCode>(),
    phone: z.string(),
    note: z.string().trim().max(2000, 'validation.tooLong'),
  })
  .refine((v) => clientPhone(v.country, v.phone), {
    path: ['phone'],
    message: 'validation.phone',
  })

export type BookingForm = z.infer<typeof bookingSchema>
