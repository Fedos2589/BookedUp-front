import { useTranslation } from 'react-i18next'
import { Typography } from 'ted-ui/Typography'

import { useCurrentBusiness } from '@/business/currentBusiness'
import styles from '@/pages/cabinet/Cabinet.module.scss'

export function DashboardPage() {
  const { t } = useTranslation()
  const business = useCurrentBusiness()

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
