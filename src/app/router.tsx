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
import { BookingPage } from '../pages/BookingPage'
import { DashboardError } from '../pages/DashboardError'
import { DashboardPage } from '../pages/DashboardPage'
import { SignUpPage } from '../pages/signUp/SignUpPage'

type RouterContext = { queryClient: QueryClient }

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
})

// Business cabinet: owner, admin, master. Signed-in only.
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: ({ context }) => requireAccount(context.queryClient),
  component: DashboardPage,
  errorComponent: DashboardError,
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
  dashboardRoute,
  signInRoute,
  signUpRoute,
  bookingRoute,
])

export function createAppRouter(
  queryClient: QueryClient,
  history?: RouterHistory,
) {
  return createRouter({ routeTree, context: { queryClient }, history })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
