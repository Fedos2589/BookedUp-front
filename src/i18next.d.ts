import 'i18next'

import type en from './locales/en.json'

// A key missing from en.json is a type error, not a raw key on screen.
declare module 'i18next' {
  interface CustomTypeOptions {
    resources: { translation: typeof en }
  }
}
