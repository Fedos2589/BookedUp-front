import { useMatches } from '@tanstack/react-router'

import { useMeControllerMe } from '@/api/account/account'
import { sessionCheckOptions } from '@/auth/session'
import { type CabinetLink, cabinetLinksFor } from '@/business/cabinetLinks'
import { currentBusinessOf } from '@/business/currentBusiness'

// The cabinet's links for the header, which sits above the router's Outlet:
// null outside the cabinet (sign-in, invite, the booking page) and on its
// error screen; an empty list for an account without a business (sign out,
// no links). The account comes from the GET /me the cabinet route has
// already loaded, so the links are there in the cabinet's first frame.
export function useCabinetLinks(): CabinetLink[] | null {
  const inCabinet = useMatches({
    select: (matches) =>
      matches.some(
        (match) => match.routeId === '/cabinet' && match.status === 'success',
      ),
  })
  // The session check's options: the answer beforeLoad has just fetched is
  // fresh for 30 s, so the header does not ask GET /me again on top of it.
  const { data: account } = useMeControllerMe({
    query: { ...sessionCheckOptions(), enabled: inCabinet },
  })
  if (!inCabinet || !account) return null
  const business = currentBusinessOf(account)
  return business ? cabinetLinksFor(business.role) : []
}
