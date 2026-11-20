import { Link } from '@tanstack/react-router'
import useBreakpoints from 'ted-ui/hooks/useBreakpoints'
import { Typography } from 'ted-ui/Typography'

import styles from './AppHeader.module.scss'
import { BurgerMenu } from './BurgerMenu'
import { CabinetNav } from './CabinetNav'
import { LanguageSelect } from './LanguageSelect'
import { SignOut } from './SignOut'
import { useCabinetLinks } from './useCabinetLinks'

// The top of every page: the logo and the language. The logo leads to the
// business's home, so a page that isn't the business's (the public booking
// page) shows it without the link. In the cabinet the same row also holds
// the navigation and «Sign out»; on a phone the cabinet's part folds into a
// burger. The switch is useBreakpoints, not the `mobile` mixin, so the links
// are in the DOM once; the app renders only in the browser (no hydration),
// so the first frame already has the real width and nothing flashes.
export function AppHeader({ linkedLogo }: { linkedLogo: boolean }) {
  const links = useCabinetLinks()
  const { isMobile } = useBreakpoints()
  const burger = isMobile && links
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
      {burger && <BurgerMenu links={links} className={styles.end} />}
      {!burger && links && (
        <CabinetNav links={links} variant="t3" className={styles.nav} />
      )}
      {!burger && (
        <div className={styles.actions}>
          <LanguageSelect />
          {links && <SignOut />}
        </div>
      )}
    </header>
  )
}
