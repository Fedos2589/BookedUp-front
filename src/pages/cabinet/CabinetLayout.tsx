import { Link, Outlet } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Typography } from 'ted-ui/Typography'

import { useMeControllerMeSuspense } from '@/api/account/account'
import { CurrentBusiness, currentBusinessOf } from '@/business/currentBusiness'
import { roleCan } from '@/business/roles'
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

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        {business && (
          <nav className={styles.nav} aria-label={t('cabinet.navigation')}>
            <Typography variant="t3">
              <Link to="/" className={styles.link}>
                {t('cabinet.dashboard')}
              </Link>
            </Typography>
            <Typography variant="t3">
              <Link to="/schedule" className={styles.link}>
                {t('cabinet.schedule')}
              </Link>
            </Typography>
            {roleCan(business.role, 'viewSettings') && (
              <Typography variant="t3">
                <Link to="/settings" className={styles.link}>
                  {t('cabinet.settings')}
                </Link>
              </Typography>
            )}
            {roleCan(business.role, 'viewTeam') && (
              <Typography variant="t3">
                <Link to="/team" className={styles.link}>
                  {t('cabinet.team')}
                </Link>
              </Typography>
            )}
          </nav>
        )}
        <SignOut />
      </header>
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
