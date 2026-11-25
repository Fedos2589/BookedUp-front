import { z } from 'zod'

import type { PublicBookingControllerBookBody } from '@/api/generated.schemas'
import { slotOfKey } from './slotsForPicker'

// The back's rules (public-booking): a name of 1–100 characters, a note up to
// 2000. The phone is not typed: it is the one confirmed in Telegram.
export const contactsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'validation.required')
    .max(100, 'validation.tooLong'),
  note: z.string().trim().max(2000, 'validation.tooLong'),
})

export type ContactsForm = z.infer<typeof contactsSchema>

export const contactsDefaults: ContactsForm = { name: '', note: '' }

// The booking request for the chosen time (its key from the address). An "any
// master" hours time carries no master; an empty note is left out.
export function bookBody(
  slotKey: string,
  values: ContactsForm,
): PublicBookingControllerBookBody {
  return {
    ...slotOfKey(slotKey),
    name: values.name.trim(),
    ...(values.note ? { note: values.note } : {}),
  }
}
