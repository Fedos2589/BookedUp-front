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

const STORAGE_KEY = 'language'

const isLanguage = (value: string | null): value is Language =>
  LANGUAGES.some((language) => language === value)

// The language the person picked, kept in this browser. Storage can be
// blocked (private mode, site data off): then there is simply no choice.
function savedLanguage(): Language | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return isLanguage(value) ? value : null
  } catch {
    return null
  }
}

export function saveLanguage(language: Language) {
  try {
    localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // The choice then lasts until the page is closed.
  }
}

// What the app starts in: the saved choice, else the browser's preference.
export function initialLanguage(preferred: readonly string[]): Language {
  return savedLanguage() ?? detectLanguage(preferred)
}

// Each language under its own name, whatever the app speaks now: someone who
// landed in the wrong one must still recognise theirs.
export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  ru: 'Русский',
}
