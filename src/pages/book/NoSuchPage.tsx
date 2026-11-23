import { useTranslation } from 'react-i18next'
import { Typography } from 'ted-ui/Typography'

import styles from './BookingPage.module.scss'

// An address with no business behind it. No way into the cabinet from here:
// the visitor is a client.
export function NoSuchPage() {
  const { t } = useTranslation()
  return (
    <main className={styles.page}>
      <Typography variant="h3" component="h1">
        {t('booking.noSuchPage')}
      </Typography>
    </main>
  )
}
