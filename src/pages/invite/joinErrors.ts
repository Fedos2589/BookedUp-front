import type { TFunction } from 'i18next'

import { ApiError } from '@/apiFetch'

// 404: used, revoked, expired or never issued. 400: not even shaped like a
// token (cut short or glued to text by a messenger) — retrying never helps.
export const isGone = (error: unknown) =>
  error instanceof ApiError && (error.status === 404 || error.status === 400)

// Accepting and signing up fail the same few ways. A 409 is either "already in
// this team" or "the offered schedule is taken" — the back tells them apart
// only in English prose, so one text covers both.
export function joinErrorText(t: TFunction, error: unknown) {
  if (isGone(error)) return t('invite.gone')
  if (error instanceof ApiError && error.status === 409)
    return t('invite.conflict')
  if (error instanceof ApiError && error.status === 429)
    return t('auth.tooManyAttempts')
  return t('auth.failed')
}
