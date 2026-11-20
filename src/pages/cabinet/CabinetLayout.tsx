import { useEffect } from 'react'
import { Link, Outlet } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Typography } from 'ted-ui/Typography'

import { useMeControllerMeSuspense } from '@/api/account/account'
import { CurrentBusiness, currentBusinessOf } from '@/business/currentBusiness'
import { useFillsScreen } from '@/app/useFillsScreen'
import { cabinetLinksFor } from '@/business/cabinetLinks'
import { useCabinetMenu } from '@/app/cabinetMenu'
import styles from './Cabinet.module.scss'
import { NoBusiness } from './NoBusiness'
import { SignOut } from './SignOut'

// Every page of the business cabinet: its navigation and sign out, then the
// page (the router's Outlet). The session check lives on the route, once.
// Without a business there is nothing to navigate: a screen that says so.
export function CabinetLayout() {
  const { t } = useTranslation()
  // The cabinet route's beforeLoad has loaded it, so this never suspends.
  const { data: account } = useMeControllerMeSuspense()
  const business = currentBusinessOf(account)
  const fillsScreen = useFillsScreen()
  const links = business ? cabinetLinksFor(business.role) : []
  const setMenu = useCabinetMenu((state) => state.set)
  const role = business?.role
  useEffect(() => {
    setMenu(role ? cabinetLinksFor(role) : null)
    return () => setMenu(null)
  }, [role, setMenu])

  return (
    <div className={fillsScreen ? styles.screenShell : styles.shell}>
      <div className={styles.header}>
        {business && (
          <nav className={styles.nav} aria-label={t('cabinet.navigation')}>
            {links.map(({ to, label }) => (
              <Typography key={to} variant="t3">
                <Link to={to} className={styles.link}>
                  {t(label)}
                </Link>
              </Typography>
            ))}
          </nav>
        )}
        <SignOut />
      </div>
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
