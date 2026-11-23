import { ApiError } from '@/apiFetch'

// What the back's refusal of a booking means for the screen: the time is gone
// (back to step 2), a text under the button (a locale key), or fields to mark.
export type Refusal =
  | { kind: 'taken' }
  | {
      kind: 'text'
      key: 'booking.tooMany' | 'booking.tooManyAttempts' | 'booking.failed'
    }
  | { kind: 'fields'; fields: ('name' | 'phone' | 'note')[] }

const FIELDS = ['name', 'phone', 'note'] as const

const bodyOf = (error: ApiError) =>
  (error.body ?? {}) as { code?: string; message?: unknown }

export function refusalOf(error: unknown): Refusal {
  if (!(error instanceof ApiError))
    return { kind: 'text', key: 'booking.failed' }
  const { code, message } = bodyOf(error)
  if (error.status === 409) {
    if (code === 'notFree' || code === 'full') return { kind: 'taken' }
    if (code === 'tooManyBookings')
      return { kind: 'text', key: 'booking.tooMany' }
  }
  if (error.status === 429)
    return { kind: 'text', key: 'booking.tooManyAttempts' }
  if (error.status === 400) {
    const lines = Array.isArray(message) ? message.map(String) : []
    const fields = FIELDS.filter((field) =>
      lines.some((line) => line.startsWith(`${field}:`)),
    )
    if (fields.length > 0) return { kind: 'fields', fields: [...fields] }
  }
  return { kind: 'text', key: 'booking.failed' }
}
