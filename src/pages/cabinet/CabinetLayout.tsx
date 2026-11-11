import { useQueryClient } from '@tanstack/react-query'
import { Link, Outlet, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Typography } from 'ted-ui/Typography'

import { useMeControllerMeSuspense } from '@/api/account/account'
import { useSessionControllerSignOut } from '@/api/auth/auth'
import { CurrentBusiness, currentBusinessOf } from '@/business/currentBusiness'
import { roleCan } from '@/business/roles'
import styles from './Cabinet.module.scss'

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

function SignOut() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const signOut = useSessionControllerSignOut({
    mutation: {
      // Everything cached belongs to the account that just left.
      onSuccess: async () => {
        queryClient.clear()
        await navigate({ to: '/sign-in' })
      },
    },
  })

  return (
    <div className={styles.signOut}>
      <Button
        variant="ghost"
        colorScheme="grey"
        loading={signOut.isPending}
        onClick={() => signOut.mutate()}
      >
        {t('cabinet.signOut')}
      </Button>
      {signOut.isError && (
        <Typography variant="t4" color="red-300" role="alert">
          {t('auth.failed')}
        </Typography>
      )}
    </div>
  )
}

// The account was removed from its last business. A new invitation link
// brings it back; until then, signing out is all there is to do.
function NoBusiness() {
  const { t } = useTranslation()

  return (
    <main className={styles.page}>
      <Typography variant="h3" component="h1">
        {t('cabinet.noBusiness.title')}
      </Typography>
      <Typography variant="t3" component="p" color="grey-400">
        {t('cabinet.noBusiness.text')}
      </Typography>
    </main>
  )
}
