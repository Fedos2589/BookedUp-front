// What the address says about the client list: the text searched for. It lives
// in the address so Back from a card returns to the same search.
export type ClientsSearch = { q?: string }

export const clientsSearchOf = (
  search: Record<string, unknown>,
): ClientsSearch => ({
  q:
    typeof search.q === 'string' && search.q.trim()
      ? search.q.trim()
      : undefined,
})
