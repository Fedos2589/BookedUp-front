import { RiGlobalLine } from '@remixicon/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Popover } from 'ted-ui/Popover/Popover'

import styles from './LanguageSelect.module.scss'
import {
  isLanguage,
  LANGUAGE_NAMES,
  LANGUAGES,
  type Language,
  saveLanguage,
} from '@/language'

// The dropdown that switches the app's language and remembers the choice.
// Two or three languages are a short list, not a search: a Popover of buttons.
export function LanguageSelect() {
  const { t, i18n } = useTranslation()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const [open, setOpen] = useState(false)
  const current = isLanguage(i18n.language) ? i18n.language : 'en'

  const choose = (language: Language) => {
    saveLanguage(language)
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
