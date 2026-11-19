import { RiGlobalLine } from '@remixicon/react'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Combobox } from 'ted-ui/Combobox'

import {
  LANGUAGE_NAMES,
  LANGUAGES,
  type Language,
  saveLanguage,
} from '@/language'

// The dropdown that switches the app's language and remembers the choice.
export function LanguageSelect() {
  const { t, i18n } = useTranslation()
  const current = i18n.language as Language

  return (
    <Combobox<Language>
      options={[...LANGUAGES]}
      value={current}
      itemToStringLabel={(language) => LANGUAGE_NAMES[language]}
      mobileLabel={t('header.language')}
      onValueChange={(language) => {
        if (!language) return
        saveLanguage(language)
        void i18n.changeLanguage(language)
      }}
      trigger={
        <Button
          variant="ghost"
          colorScheme="grey"
          aria-label={t('header.language')}
        >
          <RiGlobalLine aria-hidden size={18} /> {LANGUAGE_NAMES[current]}
        </Button>
      }
    />
  )
}
