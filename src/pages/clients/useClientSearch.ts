import { useState } from 'react'

import { useClientsControllerList } from '@/api/clients/clients'
import { useCurrentBusiness } from '@/business/currentBusiness'

// The text of a client search field and the clients the back found for it
// (name or phone digits).
export function useClientSearch() {
  const business = useCurrentBusiness()
  const [query, setQuery] = useState('')
  const found = useClientsControllerList(business.id, {
    q: query.trim() || undefined,
    limit: 20,
  })
  return { query, setQuery, found: found.data?.items ?? [] }
}
