import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { registerUIKitTranslations } from 'ted-ui/i18n/resources'

import en from './locales/en.json'
import ru from './locales/ru.json'

// English is the default; Russian is the second language.
export const resources = {
  en: { translation: en },
  ru: { translation: ru },
} as const

void i18n.use(initReactI18next).init({
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: ['en', 'ru'],
  resources,
  interpolation: { escapeValue: false },
})

registerUIKitTranslations(i18n)

export default i18n
