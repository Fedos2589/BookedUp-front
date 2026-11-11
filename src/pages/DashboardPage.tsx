import { useTranslation } from 'react-i18next'
import { Typography } from 'ted-ui/Typography'

import { useMeControllerMeSuspense } from '@/api/account/account'
import { currentBusinessOf } from '@/business/currentBusiness'
import styles from './DashboardPage.module.scss'

export function DashboardPage() {
  const { t } = useTranslation()
  // The cabinet route's beforeLoad has loaded it, so this never suspends.
  const { data: account } = useMeControllerMeSuspense()
  const business = currentBusinessOf(account)

  return (
    <main className={styles.page}>
      <Typography variant="h3" component="h1">
        {business.name}
      </Typography>
      <Typography variant="t3" component="p" color="grey-400">
        {t('dashboard.subtitle')}
      </Typography>
    </main>
  )
}
