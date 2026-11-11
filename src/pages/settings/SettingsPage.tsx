import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Typography } from 'ted-ui/Typography'

import { useMeControllerMeSuspense } from '../../api/account/account'
import { currentBusinessOf } from '../../business/currentBusiness'
import { timeIn } from '../../dates'
import { useNow } from '../../useNow'
import styles from './SettingsPage.module.scss'

// What the business is set up with: read-only for now (E2 asks to see the time
// zone). All of it comes with GET /me; editing will bring its own endpoint.
export function SettingsPage() {
  const { t } = useTranslation()
  // The cabinet route's beforeLoad has loaded it, so this never suspends.
  const { data: account } = useMeControllerMeSuspense()
  const business = currentBusinessOf(account)
  const now = useNow()

  return (
    <main className={styles.page}>
      <Typography variant="h3" component="h1">
        {t('settings.title')}
      </Typography>
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
