import { expect, test } from 'vitest'

import en from './en.json'
import ru from './ru.json'

const PLURAL = /_(zero|one|two|few|many|other)$/

// Every key path of a nested messages object: `auth.signIn.title`.
function keys(messages: object, prefix = ''): string[] {
  return Object.entries(messages).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? keys(value, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  )
}

// Plural forms differ by language (en: one/other, ru: one/few/many/other), so
// `seats_few` counts as the key `seats` when the languages are compared...
const withoutPlural = (paths: string[]) => [
  ...new Set(paths.map((p) => p.replace(PLURAL, ''))),
]

test('ru has exactly the keys of en', () => {
  expect(withoutPlural(keys(ru)).sort()).toEqual(withoutPlural(keys(en)).sort())
})

// ...and each language must have every form its own plural rules use.
test.each([
  ['en', en],
  ['ru', ru],
])('%s has every plural form of each plural key', (language, messages) => {
  const all = keys(messages)
  const forms = new Intl.PluralRules(language).resolvedOptions()
    .pluralCategories
  const bases = all
    .filter((k) => k.endsWith('_other'))
    .map((k) => k.slice(0, -6))
  for (const base of bases)
    for (const form of forms) expect(all).toContain(`${base}_${form}`)
})
