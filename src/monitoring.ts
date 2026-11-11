import * as Sentry from '@sentry/react'
import posthog, { type CaptureResult } from 'posthog-js'

// An invitation token lets whoever holds it join a team, and the back keeps
// only its hash: analytics must not get it in clear. It travels in the page
// (/invite/<token>), in sign in (?invitation=<token>) and in API calls
// (/invitations/<token>/…).
const INVITATION_TOKEN =
  /(\/invite\/|\/invitations\/|[?&]invitation=)[A-Za-z0-9_-]+/g

export const scrubInvitationTokens = (text: string) =>
  text.replace(INVITATION_TOKEN, '$1:token')

// Every string in an event, at any depth: URLs sit in many properties
// ($current_url, $pathname, $referrer, $initial_current_url, …).
function scrubDeep<T>(value: T): T {
  if (typeof value === 'string') return scrubInvitationTokens(value) as T
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
