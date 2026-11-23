import { RiGlobalLine } from '@remixicon/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Popover } from 'ted-ui/Popover/Popover'

import styles from './LanguageSelect.module.scss'
import { useLocaleControllerChoose } from '@/api/account/account'
import {
  isLanguage,
  LANGUAGE_NAMES,
  LANGUAGES,
  type Language,
} from '@/language'

// The dropdown that switches the app's language and tells the back, which
// keeps it on the account and in the cookie the next visit starts from.
// Two or three languages are a short list, not a search: a Popover of buttons.
export function LanguageSelect() {
  const { t, i18n } = useTranslation()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [open, setOpen] = useState(false)
  const { mutate } = useLocaleControllerChoose()
  const current = isLanguage(i18n.language) ? i18n.language : 'en'

  // The interface answers at once; if the back refuses, it goes back, so the
  // screen never says a language the cookie does not hold.
  const choose = (language: Language) => {
    mutate(
      { data: { locale: language } },
      { onError: () => void i18n.changeLanguage(current) },
    )
    void i18n.changeLanguage(language)
    setOpen(false)
  }

  return (
    <>
      <Button
        ref={setAnchor}
        variant="ghost"
        colorScheme="grey"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`${t('header.language')}: ${LANGUAGE_NAMES[current]}`}
        onClick={() => setOpen((value) => !value)}
      >
        <RiGlobalLine aria-hidden size={18} /> {LANGUAGE_NAMES[current]}
      </Button>
      <Popover
        open={open}
        onOpenChange={setOpen}
        anchor={anchor}
        align="end"
        aria-label={t('header.language')}
        className={styles.popup}
      >
        {LANGUAGES.map((language) => (
          <Button
            key={language}
            variant="ghost"
            colorScheme={language === current ? 'black' : 'grey'}
            aria-pressed={language === current}
            lang={language}
            onClick={() => choose(language)}
          >
            {LANGUAGE_NAMES[language]}
          </Button>
        ))}
      </Popover>
    </>
  )
}
