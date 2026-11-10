import { QueryCache, QueryClient } from '@tanstack/react-query'

import { ApiError } from '../apiFetch'

// A 4xx is an answer, not a glitch: retrying a 401 only delays the redirect to
// sign in. Network errors and 5xx are retried up to `limit` times.
export const retryServerErrors =
  (limit: number) => (failures: number, error: unknown) =>
    !(error instanceof ApiError && error.status < 500) && failures < limit

export function createQueryClient({
  onQueryError,
}: { onQueryError?: (error: unknown) => void } = {}) {
  return new QueryClient({
    queryCache: new QueryCache({ onError: onQueryError }),
    defaultOptions: { queries: { retry: retryServerErrors(3) } },
  })
}
