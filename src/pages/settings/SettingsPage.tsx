import { getRouteApi, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Typography } from 'ted-ui/Typography'

import { useBusinessControllerDescribeSuspense } from '../../api/businesses/businesses'
import { timeIn } from '../../dates'
import { useNow } from '../../useNow'
import styles from './SettingsPage.module.scss'

const route = getRouteApi('/settings')

// What the business is set up with: read-only for now (E2 asks to see the time
// zone; editing comes with its own PATCH endpoint).
export function SettingsPage() {
  const { t } = useTranslation()
  const { businessId } = route.useLoaderData()
  // The route's loader has fetched it, so this never suspends there.
  const { data: business } = useBusinessControllerDescribeSuspense(businessId)
  const now = useNow()

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Typography variant="h3" component="h1">
          {t('settings.title')}
        </Typography>
        <Typography variant="t3">
          <Link to="/" className={styles.link}>
            {t('settings.toDashboard')}
          </Link>
        </Typography>
      </header>
      <dl className={styles.fields}>
        <div className={styles.field}>
          <Typography variant="t5" component="dt" color="grey-400">
            {t('settings.name')}
          </Typography>
          <Typography variant="t3" component="dd" className={styles.value}>
            {business.name}
          </Typography>
        </div>
        <div className={styles.field}>
          <Typography variant="t5" component="dt" color="grey-400">
            {t('settings.bookingPage')}
          </Typography>
          <Typography variant="t3" component="dd" className={styles.value}>
            <Link
              to="/book/$businessSlug"
              params={{ businessSlug: business.slug }}
              className={styles.link}
            >
              {`${window.location.host}/book/${business.slug}`}
            </Link>
          </Typography>
        </div>
        <div className={styles.field}>
          <Typography variant="t5" component="dt" color="grey-400">
            {t('settings.timeZone')}
          </Typography>
          <dd className={styles.value}>
            <Typography variant="t3">{business.timeZone}</Typography>
            <Typography variant="t5" color="grey-400">
              {t('settings.localTime', {
                time: timeIn(now, business.timeZone),
              })}
            </Typography>
          </dd>
        </div>
      </dl>
    </main>
  )
}
