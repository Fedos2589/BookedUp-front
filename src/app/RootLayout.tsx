import { Outlet, useMatches } from '@tanstack/react-router'

import { AppHeader } from './AppHeader'
import { useFillsScreen } from './useFillsScreen'
import styles from './RootLayout.module.scss'

// The header, then the page (the router's Outlet). The page takes the rest of
// the screen's height, which is how a short page centres in it. The public
// booking page is a client's, not the business's: its logo doesn't lead to
// the business's home (a sign-in for the client).
export function RootLayout() {
  const linkedLogo = useMatches().every(
    (match) => match.routeId !== '/book/$businessSlug',
  )

  const fillsScreen = useFillsScreen()

  return (
    <div className={fillsScreen ? styles.screen : styles.layout}>
      <AppHeader linkedLogo={linkedLogo} />
      <Outlet />
    </div>
  )
}
