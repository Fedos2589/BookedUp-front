import 'i18next'

import type kit from 'ted-ui/i18n/locales/en.json'

import type en from './locales/en.json'

// A key missing from en.json is a type error, not a raw key on screen. TedUI's
// namespace is listed too: tsc checks the kit's sources, which call
// useTranslation('ui-kit').
declare module 'i18next' {
  interface CustomTypeOptions {
    resources: { translation: typeof en; 'ui-kit': typeof kit }
  }
}
