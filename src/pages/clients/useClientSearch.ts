import { keepPreviousData } from '@tanstack/react-query'
import { useState } from 'react'

import { useClientsControllerList } from '@/api/clients/clients'
import { useCurrentBusiness } from '@/business/currentBusiness'
import { useDebounced } from './useDebounced'

const SEARCH_DELAY_MS = 300
// The back refuses a longer `q` (400).
const SEARCH_MAX_LENGTH = 100

// The text of a client search field and the clients the back found for it
// (name or phone digits): asked 300 ms after the last key, the previous list
// stays on screen meanwhile.
export function useClientSearch() {
  const business = useCurrentBusiness()
  const [query, setQuery] = useState('')
  const q = useDebounced(
    query.trim().slice(0, SEARCH_MAX_LENGTH),
    SEARCH_DELAY_MS,
  )
  const found = useClientsControllerList(
    business.id,
    { q: q || undefined, limit: 20 },
    { query: { placeholderData: keepPreviousData } },
  )
  return { query, setQuery, found: found.data?.items ?? [] }
}
