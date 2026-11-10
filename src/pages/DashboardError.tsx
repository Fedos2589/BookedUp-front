import { useRouter } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Typography } from 'ted-ui/Typography'

// The cabinet could not check the session (network, 5xx): say so and offer to
// run the check again, instead of a blank page.
export function DashboardError() {
  const { t } = useTranslation()
  const router = useRouter()

  return (
    <main>
      <Typography variant="h3" component="h1">
        {t('dashboard.loadFailed')}
      </Typography>
      <Button onClick={() => void router.invalidate()}>
        {t('dashboard.tryAgain')}
      </Button>
    </main>
  )
}
