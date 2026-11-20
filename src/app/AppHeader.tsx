import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Typography } from 'ted-ui/Typography'

import styles from './AppHeader.module.scss'
import { useCabinetMenu } from './cabinetMenu'
import { LanguageSelect } from './LanguageSelect'
import { SignOut } from './SignOut'

// The top of every page: the logo and the language. The logo leads to the
// business's home, so a page that isn't the business's (the public booking
// page) shows it without the link. In the cabinet the same row also holds
// the navigation and «Sign out» (the cabinet fills useCabinetMenu).
export function AppHeader({ linkedLogo }: { linkedLogo: boolean }) {
  const { t } = useTranslation()
  const links = useCabinetMenu((state) => state.links)
  const logo = (
    <>
      <img src="/favicon.svg" alt="" width="28" height="28" />
      <Typography variant="h5" component="span">
        BookedUp
      </Typography>
    </>
  )

  return (
    <header className={styles.header}>
      {linkedLogo ? (
        <Link to="/" className={styles.logo}>
          {logo}
        </Link>
      ) : (
        <div className={styles.logo}>{logo}</div>
      )}
      {links && links.length > 0 && (
        <nav className={styles.nav} aria-label={t('cabinet.navigation')}>
          {links.map(({ to, label }) => (
            <Typography key={to} variant="t3">
              <Link to={to} className={styles.link}>
                {t(label)}
              </Link>
            </Typography>
          ))}
        </nav>
      )}
      <div className={styles.actions}>
        <LanguageSelect />
        {links && <SignOut />}
      </div>
    </header>
  )
}
