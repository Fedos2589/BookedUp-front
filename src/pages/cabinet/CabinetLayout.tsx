import { Outlet } from '@tanstack/react-router'

import { useMeControllerMeSuspense } from '@/api/account/account'
import { CurrentBusiness, currentBusinessOf } from '@/business/currentBusiness'
import { useFillsScreen } from '@/app/useFillsScreen'
import styles from './Cabinet.module.scss'
import { NoBusiness } from './NoBusiness'

// Every page of the business cabinet: the frame, then the page (the router's
// Outlet). The navigation and sign out are in the header (AppHeader). The
// session check lives on the route, once. Without a business there is
// nothing to navigate: a screen that says so.
export function CabinetLayout() {
  // The cabinet route's beforeLoad has loaded it, so this never suspends.
  const { data: account } = useMeControllerMeSuspense()
  const business = currentBusinessOf(account)
  const fillsScreen = useFillsScreen()

  return (
    <div className={fillsScreen ? styles.screenShell : styles.shell}>
      {business ? (
        <CurrentBusiness value={business}>
          <Outlet />
        </CurrentBusiness>
      ) : (
        <NoBusiness />
      )}
    </div>
  )
}
