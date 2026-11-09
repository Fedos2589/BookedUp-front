import * as Sentry from '@sentry/react'
import posthog from 'posthog-js'

// Both stay off until their keys are set in the environment.
export function initMonitoring() {
  const { VITE_SENTRY_DSN, VITE_POSTHOG_KEY } = import.meta.env

  if (VITE_SENTRY_DSN) Sentry.init({ dsn: VITE_SENTRY_DSN })
  if (VITE_POSTHOG_KEY) posthog.init(VITE_POSTHOG_KEY)
}
