// @vitest-environment happy-dom
import { cleanup, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { meQueryKey } from '@/auth/session'
import { account, fakeApi } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

test('a 401 from a public route is not the cabinet session ending', async () => {
  const api = fakeApi({
    'GET /api/me': [200, account],
    'GET /api/public/businesses/judo': [401, { code: 'clientSignIn' }],
  })
  const { router, queryClient } = renderApp('/')
  await screen.findByRole('heading', { name: 'Judo Kids' })

  await router.navigate({
    to: '/book/$businessSlug',
    params: { businessSlug: 'judo' },
  })
  await waitFor(() =>
    expect(api.calls.map((c) => c.route)).toContain(
      'GET /api/public/businesses/judo',
    ),
  )

  expect(router.state.location.pathname).toBe('/book/judo')
  expect(queryClient.getQueryData(meQueryKey())).toEqual(account)
})
