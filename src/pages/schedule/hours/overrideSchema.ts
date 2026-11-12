import { z } from 'zod'

import { weekRules, weekShape } from './weekSchema'

export type OverrideForm = z.infer<ReturnType<typeof overrideSchema>>

// One date and that day's hours: the week's shape with the first day in use,
// so the rows and the rules are the week's. `takenDates` are the dates already
// in the list (a new override on one would replace it silently; changing a
// date is what «Change» is for) — empty when an existing date is edited.
export const overrideSchema = (takenDates: readonly string[]) =>
  z.object({ date: z.string(), ...weekShape }).superRefine((form, ctx) => {
    if (form.date === '')
      ctx.addIssue({
        code: 'custom',
        path: ['date'],
        message: 'validation.dateRequired',
      })
    else if (takenDates.includes(form.date))
      ctx.addIssue({
        code: 'custom',
        path: ['date'],
        message: 'validation.dateTaken',
      })
    weekRules(form, ctx)
  })
