import { z } from 'zod'

import { SLUG_MAX_LENGTH, SLUG_PATTERN } from './slug'

// The back's sign-up rules (sign-up.schema.ts), checked here first so the owner
// sees a field error before a round trip. The back stays the authority.
export const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'validation.required')
    .max(100, 'validation.tooLong'),
  email: z
    .string()
    .trim()
    .max(254, 'validation.tooLong')
    .pipe(z.email('validation.email')),
  password: z
    .string()
    .min(8, 'validation.passwordMin')
    .max(256, 'validation.tooLong'),
  businessName: z
    .string()
    .trim()
    .min(1, 'validation.required')
    .max(100, 'validation.tooLong'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'validation.required')
    .max(SLUG_MAX_LENGTH, 'validation.tooLong')
    .regex(SLUG_PATTERN, 'validation.slug'),
  timeZone: z.string().min(1, 'validation.timeZone'),
})

export type SignUpFormInput = z.input<typeof signUpSchema>
export type SignUpFormValues = z.output<typeof signUpSchema>

// Validated before leaving the first step.
export const ACCOUNT_FIELDS = ['name', 'email', 'password'] as const
