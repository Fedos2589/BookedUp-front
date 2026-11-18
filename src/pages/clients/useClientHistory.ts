import { useInfiniteQuery } from '@tanstack/react-query'

import {
  clientsControllerAppointments,
  getClientsControllerAppointmentsQueryKey,
} from '@/api/clients/clients'
import { nextOffset, PAGE_SIZE } from './paging'

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
    getNextPageParam: nextOffset,
  })
}
