import { useTranslation } from 'react-i18next'
import { Typography } from 'ted-ui/Typography'

import styles from './Cabinet.module.scss'

// The account was removed from its last business. A new invitation link
// brings it back; until then, signing out is all there is to do.
export function NoBusiness() {
  const { t } = useTranslation()

  return (
    <main className={styles.page}>
      <Typography variant="h3" component="h1">
        {t('cabinet.noBusiness.title')}
      </Typography>
      <Typography variant="t3" component="p" color="grey-400">
        {t('cabinet.noBusiness.text')}
      </Typography>
    </main>
  )
}
