import { Link, Navigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Typography } from 'ted-ui/Typography'

import { useCurrentBusiness } from '@/business/currentBusiness'
import { roleCan } from '@/business/roles'
import { timeIn } from '@/dates'
import { useNow } from '@/useNow'
import styles from './SettingsPage.module.scss'

// What the business is set up with: read-only for now (E2 asks to see the time
// zone). All of it comes with GET /me; editing will bring its own endpoint.
// The owner's and the admins' page, not a master's (roles.ts).
export function SettingsPage() {
  const { t } = useTranslation()
  const business = useCurrentBusiness()
  const now = useNow()

  // The navigation has no link here for this role; an address typed by hand
  // lands on the dashboard.
  if (!roleCan(business.role, 'viewSettings'))
    return <Navigate to="/" replace />

  const localTime = timeIn(now, business.timeZone)

  return (
    <main className={styles.page}>
      <Typography variant="h3" component="h1">
        {t('settings.title')}
      </Typography>
      <dl className={styles.fields}>
        <div className={styles.field}>
          <Typography variant="t4" component="dt" color="grey-400">
            {t('settings.name')}
          </Typography>
          <Typography variant="t3" component="dd" className={styles.value}>
            {business.name}
          </Typography>
        </div>
        <div className={styles.field}>
          <Typography variant="t4" component="dt" color="grey-400">
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
          <Typography variant="t4" component="dt" color="grey-400">
            {t('settings.timeZone')}
          </Typography>
          <dd className={styles.value}>
            <Typography variant="t3">{business.timeZone}</Typography>
            {localTime && (
              <Typography variant="t4" color="grey-400">
                {t('settings.localTime', { time: localTime })}
              </Typography>
            )}
          </dd>
        </div>
      </dl>
    </main>
  )
}
