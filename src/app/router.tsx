import type { QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  type RouterHistory,
  Outlet,
} from '@tanstack/react-router'

import { redirectIfSignedIn, requireAccount } from '../auth/session'
import { SignInPage } from '../pages/auth/SignInPage'
import { CabinetLayout } from '../pages/cabinet/CabinetLayout'
import { BookingPage } from '../pages/BookingPage'
import { DashboardError } from '../pages/DashboardError'
import { DashboardPage } from '../pages/DashboardPage'
import { PagePending } from '../pages/PagePending'
import { SettingsPage } from '../pages/settings/SettingsPage'
import { SignUpPage } from '../pages/signUp/SignUpPage'

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

const signInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-in',
  beforeLoad: ({ context }) => redirectIfSignedIn(context.queryClient),
  component: SignInPage,
})

// An owner registers with their business.
const signUpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/sign-up',
  beforeLoad: ({ context }) => redirectIfSignedIn(context.queryClient),
  component: SignUpPage,
})

// Public booking page of a business, for its clients.
const bookingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/book/$businessSlug',
  component: BookingPage,
})

export const routeTree = rootRoute.addChildren([
  cabinetRoute.addChildren([dashboardRoute, settingsRoute]),
  signInRoute,
  signUpRoute,
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
