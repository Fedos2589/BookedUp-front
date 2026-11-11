import type { z } from 'zod'

import { fieldsOfSignUpError } from '@/pages/signUp/badRequest'
import { signUpSchema } from '@/pages/signUp/signUpSchema'

// The back's sign-up rules for an account; the business is the invitation's.
export const joinSchema = signUpSchema.pick({
  name: true,
  email: true,
  password: true,
})
export type JoinForm = z.infer<typeof joinSchema>

// The fields a 409 or a 400 names, of the three this form has.
export const joinFieldsOf = (error: unknown) =>
  fieldsOfSignUpError(error).filter(
    (field): field is keyof JoinForm => field in joinSchema.shape,
  )
