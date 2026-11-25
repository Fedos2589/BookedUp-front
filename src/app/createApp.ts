import type { RouterHistory } from '@tanstack/react-router'

import { isNoSession, meQueryKey } from '@/auth/session'
import { followAccountLanguage } from './followAccountLanguage'
import { createQueryClient } from './queryClient'
import { createAppRouter } from './router'

// The query cache and the router, wired together. Any query answering 401 while
// an account is known means the session ended (signed out in another tab,
// expired): forget everything cached and go to sign in. A guest's own 401 from
// GET /me is not that — there is no account to lose. Nor is a 401 from /public/
// (the booking client's own sign-in): a signed-in owner may open their /book page.
const isPublicQuery = (query: { queryKey: readonly unknown[] }) =>
  String(query.queryKey[0]).startsWith('/api/public/')

export function createApp(history?: RouterHistory) {
  const queryClient = createQueryClient({
    onQueryError: (error, query) => {
      if (!isNoSession(error) || isPublicQuery(query)) return
      if (queryClient.getQueryData(meQueryKey()) === undefined) return
      queryClient.clear()
      void router.navigate({ to: '/sign-in', replace: true })
    },
  })
  followAccountLanguage(queryClient)
  const router = createAppRouter(queryClient, history)
  return { queryClient, router }
}
