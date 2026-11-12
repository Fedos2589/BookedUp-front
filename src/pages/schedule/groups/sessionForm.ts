import { z } from 'zod'

import { instantOf } from '@/dates'
import type { GroupsControllerAddSessionBody } from '@/api/generated.schemas'
import { endIsNotStart, endIsStart, sessionFields } from './groupForm'

// A one-off session is a group's fields with a day instead of weekdays.
export const sessionSchema = z
  .object({
    ...sessionFields,
    date: z.string().min(1, 'validation.required'),
  })
  .refine(endIsNotStart, endIsStart)

export type SessionForm = z.infer<typeof sessionSchema>

export const emptySessionForm: SessionForm = {
  title: '',
  description: '',
  date: '',
  startMinute: null,
  endMinute: null,
  capacity: '',
}

// Takes a form the schema has accepted. The times are clock times on the
// business's day: an end before the start is the next day. undefined for a
// zone this browser does not know.
export function toSessionBody(
  form: SessionForm,
  timeZone: string,
): GroupsControllerAddSessionBody | undefined {
  const start = form.startMinute ?? 0
  const end = form.endMinute ?? start
  const startsAt = instantOf(form.date, start, timeZone)
  const endsAt = instantOf(form.date, end > start ? end : end + 1440, timeZone)
  if (!startsAt || !endsAt) return undefined
  return {
    title: form.title,
    description: form.description || null,
    startsAt,
    endsAt,
    capacity: Number(form.capacity),
  }
}
