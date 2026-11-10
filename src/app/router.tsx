import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
} from '@tanstack/react-router'

import { BookingPage } from '../pages/BookingPage'
import { DashboardPage } from '../pages/DashboardPage'

const rootRoute = createRootRoute({ component: Outlet })

// Business cabinet: owner, admin, master.
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardPage,
})

// Public booking page of a business, for its clients.
const bookingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/book/$businessSlug',
  component: BookingPage,
})

export const routeTree = rootRoute.addChildren([dashboardRoute, bookingRoute])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
