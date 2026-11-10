import { useTranslation } from 'react-i18next'
import { Spinner } from 'ted-ui/Spinner/Spinner'

import styles from './PagePending.module.scss'

// Shown by the router when a route's beforeLoad (the session check) takes over
// a second; named, so screen readers hear it as a status.
export function PagePending() {
  const { t } = useTranslation()

  return (
    <main className={styles.page}>
      <Spinner size="large" aria-label={t('common.loading')} />
    </main>
  )
}
