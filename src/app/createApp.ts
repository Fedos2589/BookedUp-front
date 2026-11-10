import type { RouterHistory } from '@tanstack/react-router'

import { isNoSession, meQueryKey } from '../auth/session'
import { createQueryClient } from './queryClient'
import { createAppRouter } from './router'

// The query cache and the router, wired together. Any query answering 401 while
// an account is known means the session ended (signed out in another tab,
// expired): forget everything cached and go to sign in. A guest's own 401 from
// GET /me is not that — there is no account to lose.
export function createApp(history?: RouterHistory) {
  const queryClient = createQueryClient({
    onQueryError: (error) => {
      if (!isNoSession(error)) return
      if (queryClient.getQueryData(meQueryKey()) === undefined) return
      queryClient.clear()
      void router.navigate({ to: '/sign-in', replace: true })
    },
  })
  const router = createAppRouter(queryClient, history)
  return { queryClient, router }
}
