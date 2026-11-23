import { getRouteApi } from '@tanstack/react-router'

import { InvitationGone } from './InvitationGone'
import { InvitePage } from './InvitePage'

const route = getRouteApi('/invite/$token')

// No token of the back's shape in the address: a dead link. The generated
// client puts the token into the API path as is, so such a one is never sent.
export function InviteRoute() {
  const { token } = route.useParams()
  return token ? <InvitePage token={token} /> : <InvitationGone />
}
