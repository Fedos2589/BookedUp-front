import { z } from 'zod'

// The back's rule for an address. Not borrowed from the sign-up schema: the
// booking page must not load the cabinet's code.
export const emailSchema = z.object({
  email: z
    .string()
    .trim()
    .max(254, 'validation.tooLong')
    .pipe(z.email('validation.email')),
})
export type EmailForm = z.infer<typeof emailSchema>
