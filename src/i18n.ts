import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { registerUIKitTranslations } from 'ted-ui/i18n/resources'

void i18n.use(initReactI18next).init({
  lng: 'ru',
  fallbackLng: 'en',
  resources: {},
  interpolation: { escapeValue: false },
})

registerUIKitTranslations(i18n)

export default i18n
