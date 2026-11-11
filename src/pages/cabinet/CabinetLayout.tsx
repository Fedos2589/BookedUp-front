import { useQueryClient } from '@tanstack/react-query'
import { Link, Outlet, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Typography } from 'ted-ui/Typography'

import { useSessionControllerSignOut } from '@/api/auth/auth'
import styles from './Cabinet.module.scss'

// Every page of the business cabinet: its navigation and sign out, then the
// page (the router's Outlet). The session check lives on the route, once.
export function CabinetLayout() {
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
    <div className={styles.shell}>
      <header className={styles.header}>
        <nav className={styles.nav} aria-label={t('cabinet.navigation')}>
          <Typography variant="t3">
            <Link to="/" className={styles.link}>
              {t('cabinet.dashboard')}
            </Link>
          </Typography>
          <Typography variant="t3">
            <Link to="/settings" className={styles.link}>
              {t('cabinet.settings')}
            </Link>
          </Typography>
        </nav>
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
      </header>
      <Outlet />
    </div>
  )
}
