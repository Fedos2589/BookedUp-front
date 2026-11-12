import { ApiError } from '@/apiFetch'

// The back's word on a date that is in the past (the picker stops those; this
// is for a day that changed under an open dialog).
export const isPastDateAnswer = (error: unknown) =>
  error instanceof ApiError &&
  error.status === 400 &&
  (error.body as { message?: string[] } | undefined)?.message?.some((m) =>
    m.startsWith('date:'),
  ) === true
