import { z } from 'zod'

import { overlaps, type Placed } from './weekModel'

// A week of hours (weekModel's Week). Seven days, the first is Monday. The
// rules are the back's; each issue sits where the form shows it: on the
// interval, or on the day for «a working day without intervals».
export const weekSchema = z
  .object({
    days: z.array(
      z.object({
        working: z.boolean(),
        intervals: z.array(
          z.object({
            start: z.number(),
            end: z.number(),
            title: z.string().nullable(),
          }),
        ),
      }),
    ),
    slotMinutes: z.number(),
  })
  .superRefine((week, ctx) => {
    const checked: Placed[] = []
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: 'custom', path, message })
    week.days.forEach((day, d) => {
      if (!day.working) return
      if (day.intervals.length === 0) issue(['days', d], 'validation.emptyDay')
      day.intervals.forEach((interval, index) => {
        const path = ['days', d, 'intervals', index]
        const placed = { weekday: d + 1, index, ...interval }
        if (interval.end <= interval.start)
          issue(path, 'validation.endBeforeStart')
        else if (checked.some((other) => overlaps(other, placed)))
          issue(path, 'validation.overlap')
        else if (week.slotMinutes > interval.end - interval.start)
          issue(path, 'validation.slotTooLong')
        if (interval.end > interval.start) checked.push(placed)
      })
    })
  })
