import { type CountryCode, parsePhoneNumberFromString } from 'libphonenumber-js'
import { z } from 'zod'

import type { PublicBookingControllerBookBody } from '@/api/generated.schemas'
import { slotOfKey } from './slotsForPicker'

// The back's rules (public-booking): a name of 1–100 characters, a phone in
// +E.164, a note up to 2000.
export const contactsSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'validation.required')
      .max(100, 'validation.tooLong'),
    country: z.custom<CountryCode>(),
    phone: z.string(),
    note: z.string().trim().max(2000, 'validation.tooLong'),
  })
  .superRefine((v, ctx) => {
    if (!phoneOf(v.country, v.phone))
      ctx.addIssue({
        code: 'custom',
        path: ['phone'],
        message: 'validation.phone',
      })
  })

export type ContactsForm = z.infer<typeof contactsSchema>

// What the back takes as a phone, undefined while the number is not a whole one.
function phoneOf(country: CountryCode, nationalNumber: string) {
  const phone = parsePhoneNumberFromString(nationalNumber, country)
  return phone?.isValid() ? phone.number : undefined
}

export const contactsDefaults = (language: string): ContactsForm => ({
  name: '',
  country: language === 'ru' ? 'RU' : 'US',
  phone: '',
  note: '',
})

// The booking request for the chosen time (its key from the address). An "any
// master" hours time carries no master; an empty note is left out.
export function bookBody(
  slotKey: string,
  values: ContactsForm,
): PublicBookingControllerBookBody {
  return {
    ...slotOfKey(slotKey),
    name: values.name.trim(),
    phone: phoneOf(values.country, values.phone) ?? '',
    ...(values.note ? { note: values.note } : {}),
  }
}
