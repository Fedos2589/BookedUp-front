import type { TFunction } from 'i18next'

import en from '@/locales/en.json'

// Form schemas use these keys as their messages, so the error a field shows is
// translated, not zod's English default.
export type ValidationMessage = `validation.${keyof typeof en.validation}`

const isValidationMessage = (message: string): message is ValidationMessage =>
  message.startsWith('validation.') &&
  message.slice('validation.'.length) in en.validation

export function fieldErrorText(
  t: TFunction,
  error: { message?: string } | undefined,
) {
  if (!error) return undefined
  const message = error.message ?? ''
  return t(isValidationMessage(message) ? message : 'validation.invalid')
}
