import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { registerUIKitTranslations } from 'ted-ui/i18n/resources'

import { detectLanguage, LANGUAGES } from './language'
import en from '@/locales/en.json'
import ru from '@/locales/ru.json'

export const resources = {
  en: { translation: en },
  ru: { translation: ru },
} as const

// The browser's preferred language when the app speaks it, English otherwise.
// No switcher yet; it will override this.
void i18n.use(initReactI18next).init({
  lng: detectLanguage(navigator.languages ?? [navigator.language]),
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
