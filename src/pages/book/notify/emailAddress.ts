import { z } from 'zod'

import { signUpSchema } from '@/pages/signUp/signUpSchema'

// The back's rule for an address.
export const emailSchema = signUpSchema.pick({ email: true })
export type EmailForm = z.infer<typeof emailSchema>
