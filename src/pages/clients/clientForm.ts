import { type CountryCode, parsePhoneNumberFromString } from 'libphonenumber-js'
import { z } from 'zod'

import type {
  ClientsControllerCreateBody,
  ClientsControllerUpdateBody,
} from '@/api/generated.schemas'
import { clientPhone, conflictCode } from '@/pages/calendar/newBooking'

// The back's rules (clients.schema.ts): a name of 1–100 characters, a note up
// to 2000. A holder (`own`) has a phone of their own, a dependent a guardian.
export const clientSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'validation.required')
      .max(100, 'validation.tooLong'),
    kind: z.enum(['own', 'dependent']),
    country: z.custom<CountryCode>(),
    phone: z.string(),
    guardian: z.object({ id: z.string(), name: z.string() }).nullable(),
    note: z.string().trim().max(2000, 'validation.tooLong'),
  })
  .superRefine((v, ctx) => {
    if (v.kind === 'own' && !clientPhone(v.country, v.phone))
      ctx.addIssue({
        code: 'custom',
        path: ['phone'],
        message: 'validation.phone',
      })
    if (v.kind === 'dependent' && !v.guardian)
      ctx.addIssue({
        code: 'custom',
        path: ['guardian'],
        message: 'validation.required',
      })
  })

export type ClientForm = z.infer<typeof clientSchema>

type Person = {
  name: string
  phone: string | null
  guardian: { id: string; name: string } | null
  note: string | null
}

// The form's start: empty for a new client (a holder, the country of the
// language), the client's own values for an edit.
export function clientFormDefaults(
  client: Person | undefined,
  language: string,
): ClientForm {
  const country: CountryCode = language === 'ru' ? 'RU' : 'US'
  if (!client)
    return {
      name: '',
      kind: 'own',
      country,
      phone: '',
      guardian: null,
      note: '',
    }
  const parsed = client.phone
    ? parsePhoneNumberFromString(client.phone)
    : undefined
  return {
    name: client.name,
    kind: client.guardian ? 'dependent' : 'own',
    country: parsed?.country ?? country,
    phone: parsed?.nationalNumber ?? '',
    guardian: client.guardian && {
      id: client.guardian.id,
      name: client.guardian.name,
    },
    note: client.note ?? '',
  }
}

// The body of `POST /clients` for a form that passed the schema.
export function createBody(values: ClientForm): ClientsControllerCreateBody {
  const note = values.note.trim()
  const who =
    values.kind === 'dependent' && values.guardian
      ? { guardianId: values.guardian.id }
      : { phone: clientPhone(values.country, values.phone) ?? '' }
  return { name: values.name.trim(), ...who, ...(note && { note }) }
}

// The body of `PATCH /clients/:id`: only what differs from the client. A
// dependent has no phone to change; an emptied note is `null`.
export function updateBody(
  values: ClientForm,
  client: Person,
): ClientsControllerUpdateBody {
  const body: ClientsControllerUpdateBody = {}
  const name = values.name.trim()
  if (name !== client.name) body.name = name
  const phone =
    values.kind === 'own'
      ? clientPhone(values.country, values.phone)
      : undefined
  if (phone && phone !== client.phone) body.phone = phone
  const note = values.note.trim()
  if (note !== (client.note ?? '')) body.note = note || null
  return body
}

// The holder of a phone the back refused as taken (409 `phoneTaken`).
export function phoneTakenBy(error: unknown): string | undefined {
  if (conflictCode(error) !== 'phoneTaken') return undefined
  return (error as { body: { clientId?: string } }).body.clientId
}
