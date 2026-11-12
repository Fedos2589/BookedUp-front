import { z } from 'zod'

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

// The back's rules for a group. The times are clock times in the form: the
// body carries the start and the length. Seats are typed, so they are text.
export const groupSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'validation.required')
      .max(TITLE_MAX, 'validation.tooLong'),
    description: z.string().trim().max(DESCRIPTION_MAX, 'validation.tooLong'),
    weekdays: z.array(z.number()).min(1, 'validation.weekdays'),
    startMinute: minute,
    endMinute: minute,
    capacity: z
      .string()
      .trim()
      .refine(
        (s) => /^\d+$/.test(s) && Number(s) >= 1 && Number(s) <= CAPACITY_MAX,
        'validation.capacity',
      ),
  })
  .refine(
    ({ startMinute, endMinute }) =>
      startMinute === null || endMinute === null || endMinute > startMinute,
    { path: ['endMinute'], message: 'validation.endAfterStart' },
  )

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
  endMinute: group.startMinute + group.durationMinutes,
  capacity: String(group.capacity),
})

// Takes a form the schema has accepted: the times are there and in order.
export function toBody(form: GroupForm): GroupsControllerAddBody {
  const start = form.startMinute ?? 0
  return {
    title: form.title,
    description: form.description || null,
    weekdays: [...form.weekdays].sort((a, b) => a - b),
    startMinute: start,
    durationMinutes: (form.endMinute ?? start) - start,
    capacity: Number(form.capacity),
  }
}
