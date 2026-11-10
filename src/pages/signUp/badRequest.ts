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
