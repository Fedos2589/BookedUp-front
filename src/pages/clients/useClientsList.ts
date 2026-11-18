import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'

import {
  clientsControllerList,
  getClientsControllerListQueryKey,
} from '@/api/clients/clients'
import { nextOffset, PAGE_SIZE } from './paging'

// The clients matching `q`, a page at a time: `fetchNextPage` adds the next one
// (offset += limit). The key starts with the plain list's, so whatever
// invalidates the clients reloads this too.
export function useClientsList(businessId: string, q: string | undefined) {
  return useInfiniteQuery({
    queryKey: [...getClientsControllerListQueryKey(businessId), 'pages', { q }],
    queryFn: ({ pageParam, signal }) =>
      clientsControllerList(
        businessId,
        { q, limit: PAGE_SIZE, offset: pageParam },
        { signal },
      ),
    placeholderData: keepPreviousData,
    initialPageParam: 0,
    getNextPageParam: nextOffset,
  })
}
