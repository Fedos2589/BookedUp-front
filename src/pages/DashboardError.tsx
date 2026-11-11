import { useRouter } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Typography } from 'ted-ui/Typography'

import styles from '@/pages/cabinet/Cabinet.module.scss'

// The cabinet could not check the session (network, 5xx): say so and offer to
// run the check again, instead of a blank page.
export function DashboardError() {
  const { t } = useTranslation()
  const router = useRouter()

  return (
    <main className={styles.shell}>
      <Typography variant="h3" component="h1">
        {t('dashboard.loadFailed')}
      </Typography>
      <Button
        className={styles.retry}
        variant="solid"
        colorScheme="black"
        onClick={() => void router.invalidate()}
      >
        {t('common.tryAgain')}
      </Button>
    </main>
  )
}
