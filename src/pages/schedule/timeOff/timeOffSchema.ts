import { z } from 'zod'

export const NOTE_MAX = 200

// The back's rules for the note (schedule.schema.ts): trimmed, up to NOTE_MAX. The
// range is whole days, both ends picked.
export const timeOffSchema = z.object({
  range: z
    .object({ from: z.string(), to: z.string() })
    .refine(({ from, to }) => from !== '' && to !== '', 'validation.dateRange'),
  note: z.string().trim().max(NOTE_MAX, 'validation.tooLong'),
})

export type TimeOffForm = z.infer<typeof timeOffSchema>
