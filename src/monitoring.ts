import * as Sentry from '@sentry/react'
import posthog, { type CaptureResult } from 'posthog-js'

// An invitation token lets whoever holds it join a team, a booking's manage
// token lets them cancel or move it; the back keeps only their hashes, so
// analytics must not get them in clear. They travel in the page
// (/invite/<token>, /book/<slug>/manage/<token>), in sign in
// (?invitation=<token>) and in API calls (/invitations/<token>/…,
// /public/bookings/<token>/…).
const SECRET_TOKEN =
  /(\/invite\/|\/invitations\/|[?&]invitation=|\/manage\/|\/public\/bookings\/)[A-Za-z0-9_-]+/g

export const scrubSecretTokens = (text: string) =>
  text.replace(SECRET_TOKEN, '$1:token')

// Every string in an event, at any depth: URLs sit in many properties
// ($current_url, $pathname, $referrer, $initial_current_url, …).
function scrubDeep<T>(value: T): T {
  if (typeof value === 'string') return scrubSecretTokens(value) as T
  if (Array.isArray(value)) return value.map(scrubDeep) as T
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [key, scrubDeep(inner)]),
    ) as T
  return value
}

export const scrubCapture = (event: CaptureResult | null) => scrubDeep(event)
export const scrubBreadcrumb = (crumb: Sentry.Breadcrumb) => scrubDeep(crumb)

// Both stay off until their keys are set in the environment.
export function initMonitoring() {
  const { VITE_SENTRY_DSN, VITE_POSTHOG_KEY } = import.meta.env

  if (VITE_SENTRY_DSN)
    Sentry.init({
      dsn: VITE_SENTRY_DSN,
      beforeBreadcrumb: scrubBreadcrumb,
      beforeSend: (event) => scrubDeep(event),
    })
  if (VITE_POSTHOG_KEY)
    posthog.init(VITE_POSTHOG_KEY, { before_send: scrubCapture })
}
