import { render } from '@testing-library/react'
import { createMemoryHistory } from '@tanstack/react-router'

import '../i18n'
import { App } from '../app/App'
import { createApp } from '../app/createApp'

// The whole app at `path`, with its own query cache and in-memory history.
export function renderApp(path: string) {
  const { queryClient, router } = createApp(
    createMemoryHistory({ initialEntries: [path] }),
  )
  // Same retries as the app, without the seconds of backoff between them.
  queryClient.setDefaultOptions({
    queries: { ...queryClient.getDefaultOptions().queries, retryDelay: 0 },
  })
  render(<App queryClient={queryClient} router={router} />)
  return { router, queryClient }
}
