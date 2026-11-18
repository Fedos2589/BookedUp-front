import { useInfiniteQuery } from '@tanstack/react-query'

import {
  clientsControllerList,
  getClientsControllerListQueryKey,
} from '@/api/clients/clients'

export const PAGE_SIZE = 20

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
    initialPageParam: 0,
    getNextPageParam: (last, pages) => {
      const shown = pages.reduce((sum, page) => sum + page.items.length, 0)
      return shown < last.total && last.items.length > 0 ? shown : undefined
    },
  })
}
