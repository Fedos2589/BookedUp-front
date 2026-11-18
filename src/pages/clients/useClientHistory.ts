import { useInfiniteQuery } from '@tanstack/react-query'

import {
  clientsControllerAppointments,
  getClientsControllerAppointmentsQueryKey,
} from '@/api/clients/clients'
import { PAGE_SIZE } from './useClientsList'

// The client's bookings, newest first, a page at a time (offset += limit).
// The key starts with the plain list's, so invalidating the client's
// appointments reloads this too.
export function useClientHistory(businessId: string, clientId: string) {
  return useInfiniteQuery({
    queryKey: [
      ...getClientsControllerAppointmentsQueryKey(businessId, clientId),
      'pages',
    ],
    queryFn: ({ pageParam, signal }) =>
      clientsControllerAppointments(
        businessId,
        clientId,
        { limit: PAGE_SIZE, offset: pageParam },
        { signal },
      ),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => {
      const shown = pages.reduce((sum, page) => sum + page.items.length, 0)
      return shown < last.total && last.items.length > 0 ? shown : undefined
    },
  })
}
