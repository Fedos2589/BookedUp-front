import { useQueryClient } from '@tanstack/react-query'

import {
  getClientSessionControllerCurrentQueryKey,
  useClientSessionControllerCurrent,
  useClientSessionControllerEnd,
} from '@/api/client-session/client-session'

// The booking client's own session (a cookie the page can't read, so it asks):
// the confirmed phone, or null. Loading only until the first answer — a refetch
// must not unmount a form the client is filling in.
export function useClientSession() {
  const queryClient = useQueryClient()
  const current = useClientSessionControllerCurrent()
  // The back's 204 is the whole answer: no phone any more, no second request.
  const end = useClientSessionControllerEnd({
    mutation: {
      onSuccess: () =>
        queryClient.setQueryData(getClientSessionControllerCurrentQueryKey(), {
          phone: null,
        }),
    },
  })
  return {
    phone: current.data?.phone ?? null,
    isLoading: current.isPending && !current.isFetched,
    // Resolves once the answer is in the cache.
    refresh: () => current.refetch(),
    signOut: () => end.mutate(),
    signingOut: end.isPending,
    signOutFailed: end.isError,
  }
}
