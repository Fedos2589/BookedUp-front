import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { registerUIKitTranslations } from 'ted-ui/i18n/resources'

import { initialLanguage, LANGUAGES } from './language'
import en from '@/locales/en.json'
import ru from '@/locales/ru.json'

export const resources = {
  en: { translation: en },
  ru: { translation: ru },
} as const

// The language the person saved; without one, the browser's preferred language
// when the app speaks it, English otherwise.
void i18n.use(initReactI18next).init({
  lng: initialLanguage(navigator.languages ?? [navigator.language]),
  fallbackLng: 'en',
  supportedLngs: LANGUAGES,
  resources,
  interpolation: { escapeValue: false },
})

registerUIKitTranslations(i18n)

// Screen readers and the browser's translate offer read <html lang>.
const syncHtmlLang = (language: string) => {
  document.documentElement.lang = language
}
syncHtmlLang(i18n.language)
i18n.on('languageChanged', syncHtmlLang)

export default i18n
