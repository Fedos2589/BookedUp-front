import { getRouteApi } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Typography } from 'ted-ui/Typography'

import styles from './BookingPage.module.scss'

const route = getRouteApi('/book/$businessSlug')

export function BookingPage() {
  const { businessSlug } = route.useParams()
  const { t } = useTranslation()

  return (
    <main className={styles.page}>
      <Typography variant="h3" component="h1">
        {t('booking.title', { businessSlug })}
      </Typography>
    </main>
  )
}
