import { RiMenuLine } from '@remixicon/react'
import { Link } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IconButton } from 'ted-ui/IconButton/IconButton'
import { Modal } from 'ted-ui/Modal'
import { Typography } from 'ted-ui/Typography'

import type { CabinetLink } from '@/business/cabinetLinks'
import styles from './BurgerMenu.module.scss'
import { LanguageSelect } from './LanguageSelect'
import { SignOut } from './SignOut'

// The cabinet header on a phone: one button that opens the navigation, the
// language and «Sign out» in a sheet. A link closes it; focus goes back to
// the button.
export function BurgerMenu({ links }: { links: CabinetLink[] }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const button = useRef<HTMLButtonElement>(null)
  const close = () => setOpen(false)

  return (
    <>
      <IconButton
        ref={button}
        aria-label={t('header.menu')}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <RiMenuLine aria-hidden size={20} />
      </IconButton>
      <Modal
        isVisible={open}
        aria-label={t('header.menu')}
        onClose={close}
        finalFocus={button}
      >
        <nav className={styles.menu} aria-label={t('cabinet.navigation')}>
          {links.map(({ to, label }) => (
            <Typography key={to} variant="t1">
              <Link to={to} className={styles.link} onClick={close}>
                {t(label)}
              </Link>
            </Typography>
          ))}
        </nav>
        <div className={styles.actions}>
          <LanguageSelect />
          <SignOut />
        </div>
      </Modal>
    </>
  )
}
