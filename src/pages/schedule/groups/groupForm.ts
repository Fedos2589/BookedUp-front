import { z } from 'zod'

import { endFromInput, endToInput } from '@/dates'
import type {
  GroupsControllerAddBody,
  GroupsControllerList200Item,
} from '@/api/generated.schemas'

export const TITLE_MAX = 100
export const DESCRIPTION_MAX = 2000
const CAPACITY_MAX = 1000

const minute = z
  .number()
  .nullable()
  .refine((m): boolean => m !== null, 'validation.required')

// What a group and a one-off session have in common, by the back's rules. The
// times are clock times in the form; an end before the start is the next day
// (the field has no 24:00). Seats are typed, so they are text.
export const sessionFields = {
  title: z
    .string()
    .trim()
    .min(1, 'validation.required')
    .max(TITLE_MAX, 'validation.tooLong'),
  description: z.string().trim().max(DESCRIPTION_MAX, 'validation.tooLong'),
  startMinute: minute,
  endMinute: minute,
  capacity: z
    .string()
    .trim()
    .refine(
      (s) => /^\d+$/.test(s) && Number(s) >= 1 && Number(s) <= CAPACITY_MAX,
      'validation.capacity',
    ),
}

export const endIsNotStart = ({
  startMinute,
  endMinute,
}: {
  startMinute: number | null
  endMinute: number | null
}) => startMinute === null || endMinute === null || endMinute !== startMinute

export const endIsStart = {
  path: ['endMinute'],
  message: 'validation.endIsStart',
}

// The body of a group carries the start and the length.
export const groupSchema = z
  .object({
    ...sessionFields,
    weekdays: z.array(z.number()).min(1, 'validation.weekdays'),
  })
  .refine(endIsNotStart, endIsStart)

export type GroupForm = z.infer<typeof groupSchema>

export const emptyGroupForm: GroupForm = {
  title: '',
  description: '',
  weekdays: [],
  startMinute: null,
  endMinute: null,
  capacity: '',
}

export const fromGroup = (group: GroupsControllerList200Item): GroupForm => ({
  title: group.title,
  description: group.description ?? '',
  weekdays: group.weekdays,
  startMinute: group.startMinute,
  endMinute: endToInput(group.startMinute + group.durationMinutes),
  capacity: String(group.capacity),
})

// Takes a form the schema has accepted: both times are there and differ.
export function toBody(form: GroupForm): GroupsControllerAddBody {
  const start = form.startMinute ?? 0
  return {
    title: form.title,
    description: form.description || null,
    weekdays: [...form.weekdays].sort((a, b) => a - b),
    startMinute: start,
    durationMinutes: endFromInput(start, form.endMinute ?? start) - start,
    capacity: Number(form.capacity),
  }
}
