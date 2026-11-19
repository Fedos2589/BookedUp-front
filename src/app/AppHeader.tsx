import { Link } from '@tanstack/react-router'
import { Typography } from 'ted-ui/Typography'

import styles from './AppHeader.module.scss'
import { LanguageSelect } from './LanguageSelect'

// The top of every page: the logo and the language. The logo leads to the
// business's home, so a page that isn't the business's (the public booking
// page) shows it without the link.
export function AppHeader({ linkedLogo }: { linkedLogo: boolean }) {
  const logo = (
    <>
      <img src="/favicon.svg" alt="" width="28" height="28" />
      <Typography variant="h5" component="span">
        BookedUp
      </Typography>
    </>
  )

  return (
    <div className={styles.header}>
      {linkedLogo ? (
        <Link to="/" className={styles.logo}>
          {logo}
        </Link>
      ) : (
        <div className={styles.logo}>{logo}</div>
      )}
      <LanguageSelect />
    </div>
  )
}
