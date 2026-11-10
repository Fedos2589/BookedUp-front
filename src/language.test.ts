import { expect, test } from 'vitest'

import { detectLanguage } from './language'

test.each([
  [['ru-RU', 'en-US'], 'ru'],
  [['ru'], 'ru'],
  [['de-DE', 'ru-RU'], 'ru'],
  [['RU-ru'], 'ru'],
  [['en-GB', 'ru-RU'], 'en'],
  [['th-TH'], 'en'],
  [[], 'en'],
])('%j → %s', (languages, language) => {
  expect(detectLanguage(languages)).toBe(language)
})
