import { Outlet } from '@tanstack/react-router'

import { AppHeader } from './AppHeader'
import styles from './RootLayout.module.scss'

// Around every route: the header, then the page. The page takes the rest of
// the screen's height, which is how a short page centres in it.
export function RootLayout() {
  return (
    <div className={styles.layout}>
      <AppHeader />
      <Outlet />
    </div>
  )
}
