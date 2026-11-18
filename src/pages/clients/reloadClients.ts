import type { QueryClient } from '@tanstack/react-query'

// Reloads everything of the business's clients: the list, every card (a new
// dependent shows on the guardian's), the histories, the lookups by phone.
export const reloadClients = (queryClient: QueryClient, businessId: string) =>
  queryClient.invalidateQueries({
    predicate: ({ queryKey }) =>
      typeof queryKey[0] === 'string' &&
      queryKey[0].startsWith(`/api/businesses/${businessId}/clients`),
  })
