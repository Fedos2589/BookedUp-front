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
