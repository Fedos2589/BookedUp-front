import { useTranslation } from 'react-i18next'
import { Typography } from 'ted-ui/Typography'

export function DashboardPage() {
  const { t } = useTranslation()

  return (
    <main>
      <Typography variant="h3" component="h1">
        BookedUp
      </Typography>
      <Typography variant="t3">{t('dashboard.subtitle')}</Typography>
    </main>
  )
}
