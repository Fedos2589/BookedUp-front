import { RiGlobalLine } from '@remixicon/react'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Popover } from 'ted-ui/Popover/Popover'

import styles from './LanguageSelect.module.scss'
import { useLocaleControllerChoose } from '@/api/account/account'
import { type Account, meQueryKey } from '@/auth/session'
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
  const queryClient = useQueryClient()
  // The callbacks are the hook's, not mutate()'s: they run after this component
  // is gone too (the phone's menu closes at once), and one choice after another
  // goes to the back in order.
  const { mutate } = useLocaleControllerChoose({
    mutation: {
      scope: { id: 'locale' },
      onMutate: (): { previous: Language } => ({ previous: current }),
      onError: (_error, _variables, context) => {
        void i18n.changeLanguage(context?.previous ?? 'en')
      },
      // GET /me in the cache says the language the back now keeps.
      onSuccess: (_data, { data }) => {
        queryClient.setQueryData<Account>(
          meQueryKey(),
          (account) =>
            account && {
              ...account,
              user: { ...account.user, locale: data.locale },
            },
        )
      },
    },
  })
  const current = isLanguage(i18n.language) ? i18n.language : 'en'

  // The interface answers at once; if the back refuses, it goes back, so the
  // screen never says a language the cookie does not hold.
  const choose = (language: Language) => {
    mutate({ data: { locale: language } })
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
