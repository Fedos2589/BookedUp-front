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

test('ru has exactly the keys of en', () => {
  expect(keys(ru).sort()).toEqual(keys(en).sort())
})
