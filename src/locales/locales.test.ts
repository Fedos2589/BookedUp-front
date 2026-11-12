import { expect, test } from 'vitest'

import en from './en.json'
import ru from './ru.json'

// Every key path of a nested messages object: `auth.signIn.title`.
function keys(messages: object, prefix = ''): string[] {
  return Object.entries(messages).flatMap(([key, value]) =>
    typeof value === 'object' && value !== null
      ? keys(value, `${prefix}${key}.`)
      : [`${prefix}${key}`],
  )
}

// Plural forms differ by language (en: one/other, ru: one/few/many/other), so
// `seats_few` counts as the key `seats`.
const withoutPlural = (paths: string[]) => [
  ...new Set(
    paths.map((p) => p.replace(/_(zero|one|two|few|many|other)$/, '')),
  ),
]

test('ru has exactly the keys of en', () => {
  expect(withoutPlural(keys(ru)).sort()).toEqual(withoutPlural(keys(en)).sort())
})
