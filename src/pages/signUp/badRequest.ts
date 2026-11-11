import { ApiError } from '@/apiFetch'

// The sign-up form's fields, as named in the form (the back nests business ones).
export type SignUpField =
  'name' | 'email' | 'password' | 'businessName' | 'slug' | 'timeZone'

const FIELD_BY_PATH: Record<string, SignUpField> = {
  name: 'name',
  email: 'email',
  password: 'password',
  'business.name': 'businessName',
  'business.slug': 'slug',
  'business.timeZone': 'timeZone',
}

// A 400 from the back lists one message per issue, its field path first
// (`business.timeZone: Unknown IANA time zone`). Which form fields are named?
export function fieldsFromBadRequest(
  messages: readonly string[],
): SignUpField[] {
  return messages.flatMap((message) => {
    const field = FIELD_BY_PATH[message.split(':')[0]]
    return field ? [field] : []
  })
}

// The fields a sign-up's 409 (a taken email or slug) or 400 (invalid fields)
// points at. Sign up through an invitation answers the same way, for fewer
// fields.
export function fieldsOfSignUpError(error: unknown): SignUpField[] {
  if (!(error instanceof ApiError)) return []
  const body = error.body as { field?: unknown; message?: unknown } | undefined
  if (error.status === 409)
    return body?.field === 'email' || body?.field === 'slug' ? [body.field] : []
  if (error.status === 400 && Array.isArray(body?.message))
    return fieldsFromBadRequest(body.message.map(String))
  return []
}
