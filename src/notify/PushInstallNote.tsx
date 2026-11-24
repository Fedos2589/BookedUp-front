import { useTranslation } from 'react-i18next'
import { Typography } from 'ted-ui/Typography'

import styles from './ChannelRow.module.scss'

// iOS gives push to installed web apps only: where the push button would be.
export function PushInstallNote() {
  const { t } = useTranslation()
  return (
    <li className={styles.row}>
      <Typography variant="t2" color="grey-500">
        {t('notify.pushInstall')}
      </Typography>
    </li>
  )
}
