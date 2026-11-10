import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Typography } from 'ted-ui/Typography'

import { useSessionControllerSignOut } from '../api/auth/auth'
import styles from './DashboardPage.module.scss'
import { useMeControllerMeSuspense } from '../api/account/account'

export function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  // The route's beforeLoad has loaded it, so this never suspends there.
  const { data: account } = useMeControllerMeSuspense()
  const business = account.businesses[0]
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
    <main className={styles.page}>
      <header className={styles.header}>
        <Typography variant="h3" component="h1">
          {business?.name ?? 'BookedUp'}
        </Typography>
        <Button
          variant="ghost"
          colorScheme="grey"
          loading={signOut.isPending}
          onClick={() => signOut.mutate()}
        >
          {t('dashboard.signOut')}
        </Button>
      </header>
      <Typography variant="t3" component="p" color="grey-400">
        {t('dashboard.subtitle')}
      </Typography>
    </main>
  )
}
