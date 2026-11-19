import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Typography } from 'ted-ui/Typography'

import styles from './AppHeader.module.scss'
import { LanguageSelect } from './LanguageSelect'

// The top of every page: the logo (home) and the language. The cabinet's own
// navigation sits below it.
export function AppHeader() {
  const { t } = useTranslation()

  return (
    <header className={styles.header}>
      <Link to="/" className={styles.logo} aria-label={t('header.home')}>
        <img src="/favicon.svg" alt="" width="28" height="28" />
        <Typography variant="h5" component="span">
          BookedUp
        </Typography>
      </Link>
      <LanguageSelect />
    </header>
  )
}
