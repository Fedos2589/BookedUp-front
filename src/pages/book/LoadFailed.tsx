import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Typography } from 'ted-ui/Typography'

import styles from './BookingPage.module.scss'

// The business or its free times could not be loaded (not a 404: that is
// NoSuchPage).
export function LoadFailed({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation()
  return (
    <main className={styles.page}>
      <Typography variant="h3" component="h1">
        {t('booking.loadFailed')}
      </Typography>
      <Button
        variant="solid"
        colorScheme="black"
        className={styles.retry}
        onClick={onRetry}
      >
        {t('common.tryAgain')}
      </Button>
    </main>
  )
}
