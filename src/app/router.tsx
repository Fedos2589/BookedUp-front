import type { QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  lazyRouteComponent,
  type RouterHistory,
} from '@tanstack/react-router'

import { redirectIfSignedIn, requireAccount } from '@/auth/session'
import { bookingSearchOf } from '@/pages/book/bookingSearch'
import { calendarSearchOf } from '@/pages/calendar/calendarSearch'
import { clientsSearchOf } from '@/pages/clients/clientsSearch'
import { invitationTokenOf } from '@/pages/invite/invitationToken'
import { PagePending } from '@/pages/PagePending'
import { RootLayout } from './RootLayout'

type RouterContext = { queryClient: QueryClient }

// Every page, the cabinet's error screen included, is a chunk of its own: a
// client opening /book on a phone never downloads the cabinet or the sign-in
// forms (check:chunks). Only the routes' search and param parsers, tiny and
// pure, are imported here.
const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
})

// The business cabinet (owner, admin, master): signed-in only, checked once
// here for every page inside it. Its error screen covers a failed check.
const cabinetRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'cabinet',
  beforeLoad: ({ context }) => requireAccount(context.queryClient),
  component: lazyRouteComponent(
    () => import('@/pages/cabinet/CabinetLayout'),
    'CabinetLayout',
  ),
  errorComponent: lazyRouteComponent(
    () => import('@/pages/DashboardError'),
    'DashboardError',
  ),
})

const dashboardRoute = createRoute({
  getParentRoute: () => cabinetRoute,
  path: '/',
  component: lazyRouteComponent(
    () => import('@/pages/DashboardPage'),
    'DashboardPage',
  ),
})

// The business's settings.
const settingsRoute = createRoute({
  getParentRoute: () => cabinetRoute,
  path: '/settings',
  component: lazyRouteComponent(
    () => import('@/pages/settings/SettingsPage'),
    'SettingsPage',
  ),
})

// Who works in the business, and the invitations to it.
const teamRoute = createRoute({
  getParentRoute: () => cabinetRoute,
  path: '/team',
  component: lazyRouteComponent(
    () => import('@/pages/team/TeamPage'),
    'TeamPage',
  ),
})

// A master's working hours, or their groups.
const scheduleRoute = createRoute({
  getParentRoute: () => cabinetRoute,
  path: '/schedule',
  component: lazyRouteComponent(
    () => import('@/pages/schedule/SchedulePage'),
    'SchedulePage',
  ),
})

// The bookings: a day or a week of them. View, day and master live in the
// address, so a link opens exactly what was looked at.
const calendarRoute = createRoute({
  getParentRoute: () => cabinetRoute,
  path: '/calendar',
  validateSearch: calendarSearchOf,
  // One screen high: only the day grid scrolls (see useFillsScreen).
  staticData: { fillsScreen: true },
  component: lazyRouteComponent(
    () => import('@/pages/calendar/CalendarPage'),
    'CalendarPage',
  ),
})

// The business's clients; the search text lives in the address.
const clientsRoute = createRoute({
  getParentRoute: () => cabinetRoute,
  path: '/clients',
  validateSearch: clientsSearchOf,
  component: lazyRouteComponent(
    () => import('@/pages/clients/ClientsPage'),
    'ClientsPage',
  ),
})

// One client's card.
const clientRoute = createRoute({
  getParentRoute: () => cabinetRoute,
  path: '/clients/$clientId',
  component: lazyRouteComponent(
    () => import('@/pages/clients/ClientPage'),
    'ClientPage',
  ),
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
  component: lazyRouteComponent(
    () => import('@/pages/auth/SignInPage'),
    'SignInPage',
  ),
})

// An owner registers with their business.
const signUpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-up',
  beforeLoad: ({ context }) => redirectIfSignedIn(context.queryClient),
  component: lazyRouteComponent(
    () => import('@/pages/signUp/SignUpPage'),
    'SignUpPage',
  ),
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
  component: lazyRouteComponent(
    () => import('@/pages/invite/InviteRoute'),
    'InviteRoute',
  ),
})

// Public booking page of a business, for its clients.
const bookingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/book/$businessSlug',
  validateSearch: bookingSearchOf,
  component: lazyRouteComponent(
    () => import('@/pages/book/BookingPage'),
    'BookingPage',
  ),
})

// A client's private link to see their booking.
const manageRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/book/$businessSlug/manage/$token',
  component: lazyRouteComponent(
    () => import('@/pages/book/ManagePage'),
    'ManagePage',
  ),
})

export const routeTree = rootRoute.addChildren([
  cabinetRoute.addChildren([
    dashboardRoute,
    calendarRoute,
    clientsRoute,
    clientRoute,
    scheduleRoute,
    settingsRoute,
    teamRoute,
  ]),
  signInRoute,
  signUpRoute,
  inviteRoute,
  bookingRoute,
  manageRoute,
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
    // A link's chunk loads while the pointer is still on it.
    defaultPreload: 'intent',
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
  interface StaticDataRouteOption {
    fillsScreen?: boolean
  }
}
