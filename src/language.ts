export const LANGUAGES = ['en', 'ru'] as const
export type Language = (typeof LANGUAGES)[number]

// The first of the browser's preferred languages the app speaks; English when
// none is (also the default). Only the primary subtag counts: ru-RU → ru.
export function detectLanguage(preferred: readonly string[]): Language {
  for (const tag of preferred) {
    const primary = tag.split('-')[0].toLowerCase()
    const known = LANGUAGES.find((language) => language === primary)
    if (known) return known
  }
  return 'en'
}

// The cookie the back sets when the language is chosen (PUT /locale) and at
// sign-in: not HttpOnly, so the page knows its language before any request.
const COOKIE_NAME = 'lang'

export const isLanguage = (value: string | null): value is Language =>
  LANGUAGES.some((language) => language === value)

function cookieLanguage(): Language | null {
  const prefix = `${COOKIE_NAME}=`
  const entry = document.cookie
    .split('; ')
    .find((item) => item.startsWith(prefix))
  const value = entry?.slice(prefix.length) ?? null
  return isLanguage(value) ? value : null
}

// What the app starts in: the back's cookie, else the browser's preference.
export function initialLanguage(preferred: readonly string[]): Language {
  return cookieLanguage() ?? detectLanguage(preferred)
}

// Each language under its own name, whatever the app speaks now: someone who
// landed in the wrong one must still recognise theirs.
export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  ru: 'Русский',
}
