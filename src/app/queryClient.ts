import { QueryClient } from '@tanstack/react-query'

import { ApiError } from '../apiFetch'

// A 4xx is an answer, not a glitch: retrying a 401 only delays the redirect to
// sign in. Network errors and 5xx keep TanStack Query's 3 retries.
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failures, error) =>
          !(error instanceof ApiError && error.status < 500) && failures < 3,
      },
    },
  })
}
