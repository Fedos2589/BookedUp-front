import type { QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  type RouterHistory,
  Outlet,
} from '@tanstack/react-router'

import { redirectIfSignedIn, requireAccount } from '@/auth/session'
import { SignInPage } from '@/pages/auth/SignInPage'
import { CabinetLayout } from '@/pages/cabinet/CabinetLayout'
import { BookingPage } from '@/pages/BookingPage'
import { DashboardError } from '@/pages/DashboardError'
import { DashboardPage } from '@/pages/DashboardPage'
import { InvitationGone } from '@/pages/invite/InvitationGone'
import { InvitePage } from '@/pages/invite/InvitePage'
import { invitationTokenOf } from '@/pages/invite/invitationToken'
import { PagePending } from '@/pages/PagePending'
import { SchedulePage } from '@/pages/schedule/SchedulePage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { SignUpPage } from '@/pages/signUp/SignUpPage'
import { TeamPage } from '@/pages/team/TeamPage'

type RouterContext = { queryClient: QueryClient }

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
})

// The business cabinet (owner, admin, master): signed-in only, checked once
// here for every page inside it. Its error screen covers a failed check.
const cabinetRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'cabinet',
  beforeLoad: ({ context }) => requireAccount(context.queryClient),
  component: CabinetLayout,
  errorComponent: DashboardError,
})

const dashboardRoute = createRoute({
  getParentRoute: () => cabinetRoute,
  path: '/',
  component: DashboardPage,
})

// The business's settings.
const settingsRoute = createRoute({
  getParentRoute: () => cabinetRoute,
  path: '/settings',
  component: SettingsPage,
})

// Who works in the business, and the invitations to it.
const teamRoute = createRoute({
  getParentRoute: () => cabinetRoute,
  path: '/team',
  component: TeamPage,
})

// A master's working hours, or their groups.
const scheduleRoute = createRoute({
  getParentRoute: () => cabinetRoute,
  path: '/schedule',
  component: SchedulePage,
})

// `?invitation=<token>`: signed in, go back to that invitation, not the cabinet.
const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-in',
  validateSearch: (search): { invitation?: string } => ({
    invitation: invitationTokenOf(search.invitation),
  }),
  beforeLoad: ({ context, search }) =>
    redirectIfSignedIn(context.queryClient, search.invitation),
  component: SignInPage,
})

// An owner registers with their business.
const signUpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-up',
  beforeLoad: ({ context }) => redirectIfSignedIn(context.queryClient),
  component: SignUpPage,
})

// The page an invitation link opens: join the team, signed in or by signing up.
const inviteRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/invite/$token',
  // Only a token of the back's shape gets through; any other is a dead link.
  params: {
    parse: ({ token }) => ({ token: invitationTokenOf(token) }),
    stringify: ({ token }) => ({ token: token ?? '' }),
  },
  component: function Invite() {
    const { token } = inviteRoute.useParams()
    // No token of the back's shape in the address: a dead link. The generated
    // client puts the token into the API path as is, so such a one is never sent.
    return token ? <InvitePage token={token} /> : <InvitationGone />
  },
})

// Public booking page of a business, for its clients.
const bookingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/book/$businessSlug',
  component: BookingPage,
})

export const routeTree = rootRoute.addChildren([
  cabinetRoute.addChildren([
    dashboardRoute,
    scheduleRoute,
    settingsRoute,
    teamRoute,
  ]),
  signInRoute,
  signUpRoute,
  inviteRoute,
  bookingRoute,
])

export function createAppRouter(
  queryClient: QueryClient,
  history?: RouterHistory,
) {
  return createRouter({
    routeTree,
    context: { queryClient },
    history,
    defaultPendingComponent: PagePending,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
