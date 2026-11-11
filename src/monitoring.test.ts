import { expect, test, vi } from 'vitest'

import {
  initMonitoring,
  scrubBreadcrumb,
  scrubCapture,
  scrubInvitationTokens,
} from './monitoring'

const TOKEN = 'gZSff5LUn1PJSpUmEuQ2akYnZ4o62dkMZpTp_SXDcx8'

// Review of #8 — finding 3: an invitation token lets anyone join a team, and
// the back keeps only its hash; analytics must not get it in clear.
test.each([
  [`https://app.test/invite/${TOKEN}`, 'https://app.test/invite/:token'],
  [`/api/invitations/${TOKEN}/accept`, '/api/invitations/:token/accept'],
  [`/sign-in?invitation=${TOKEN}&x=1`, '/sign-in?invitation=:token&x=1'],
  ['/team', '/team'],
])('%s is reported as %s', (url, scrubbed) => {
  expect(scrubInvitationTokens(url)).toBe(scrubbed)
})

test('a PostHog event loses the token in every URL property', () => {
  const event = scrubCapture({
    uuid: '00000000-0000-4000-8000-000000000000',
    event: '$pageview',
    properties: {
      $current_url: `https://app.test/invite/${TOKEN}`,
      $pathname: `/invite/${TOKEN}`,
      $referrer: `https://app.test/sign-in?invitation=${TOKEN}`,
      count: 1,
    },
    $set_once: { $initial_current_url: `https://app.test/invite/${TOKEN}` },
  })

  expect(JSON.stringify(event)).not.toContain(TOKEN)
  expect(event?.properties.count).toBe(1)
})

test('a Sentry breadcrumb loses the token in its URLs', () => {
  const crumb = scrubBreadcrumb({
    category: 'navigation',
    data: {
      from: `/invite/${TOKEN}`,
      to: '/',
      url: `/api/invitations/${TOKEN}`,
    },
  })

  expect(JSON.stringify(crumb)).not.toContain(TOKEN)
})

const { posthogInit, sentryInit } = vi.hoisted(() => ({
  posthogInit: vi.fn(),
  sentryInit: vi.fn(),
}))
vi.mock('posthog-js', () => ({ default: { init: posthogInit } }))
vi.mock('@sentry/react', () => ({ init: sentryInit }))

test('both services are started with the scrubbing in place', () => {
  vi.stubEnv('VITE_POSTHOG_KEY', 'key')
  vi.stubEnv('VITE_SENTRY_DSN', 'https://dsn.test/1')
  initMonitoring()
  vi.unstubAllEnvs()

  const url = `https://app.test/invite/${TOKEN}`
  const { before_send } = posthogInit.mock.calls[0][1]
  const { beforeSend, beforeBreadcrumb } = sentryInit.mock.calls[0][0]
  const sent = [
    before_send({
      uuid: '1',
      event: '$pageview',
      properties: { $current_url: url },
    }),
    beforeSend({ request: { url } }),
    beforeBreadcrumb({ data: { to: url } }),
  ]
  expect(JSON.stringify(sent)).not.toContain(TOKEN)
})
