import { RiMenuLine } from '@remixicon/react'
import { useLocation } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IconButton } from 'ted-ui/IconButton/IconButton'
import { Modal } from 'ted-ui/Modal'

import type { CabinetLink } from '@/business/cabinetLinks'
import styles from './BurgerMenu.module.scss'
import { CabinetNav } from './CabinetNav'
import { LanguageSelect } from './LanguageSelect'
import { SignOut } from './SignOut'

// The cabinet header on a phone: one button that opens the navigation, the
// language and «Sign out» in a sheet. The sheet belongs to the page it was
// opened on: any change of page closes it, a link in it or the Back button
// alike. Focus goes back to the button.
export function BurgerMenu({
  links,
  className,
}: {
  links: CabinetLink[]
  className: string
}) {
  const { t } = useTranslation()
  const pathname = useLocation({ select: (location) => location.pathname })
  const [openOn, setOpenOn] = useState<string | null>(null)
  const open = openOn === pathname
  const button = useRef<HTMLButtonElement>(null)
  const close = () => setOpenOn(null)

  return (
    <>
      <IconButton
        ref={button}
        className={className}
        aria-label={t('header.menu')}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpenOn(pathname)}
      >
        <RiMenuLine aria-hidden size={20} />
      </IconButton>
      <Modal
        isVisible={open}
        aria-label={t('header.menu')}
        onClose={close}
        finalFocus={button}
      >
        <CabinetNav
          links={links}
          variant="t1"
          className={styles.menu}
          onNavigate={close}
        />
        <div className={styles.actions}>
          <LanguageSelect />
          <SignOut />
        </div>
      </Modal>
    </>
  )
}
