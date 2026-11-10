import { render } from '@testing-library/react'
import { createMemoryHistory } from '@tanstack/react-router'

import '../i18n'
import { App } from '../app/App'
import { createQueryClient } from '../app/queryClient'
import { createAppRouter } from '../app/router'

// The whole app at `path`, with its own query cache and in-memory history.
export function renderApp(path: string) {
  const queryClient = createQueryClient()
  // Same retries as the app, without the seconds of backoff between them.
  queryClient.setDefaultOptions({
    queries: { ...queryClient.getDefaultOptions().queries, retryDelay: 0 },
  })
  const router = createAppRouter(
    queryClient,
    createMemoryHistory({ initialEntries: [path] }),
  )
  render(<App queryClient={queryClient} router={router} />)
  return { router, queryClient }
}
