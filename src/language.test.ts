import { afterEach, describe, expect, test } from 'vitest'

import { detectLanguage, initialLanguage } from './language'

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

describe('the language cookie', () => {
  const setCookie = (value: string) => {
    document.cookie = `lang=${value}; path=/`
  }
  afterEach(() => {
    document.cookie = 'lang=; path=/; max-age=0'
  })

  test('the cookie the back set wins over the browser language', () => {
    setCookie('en')
    expect(initialLanguage(['ru-RU'])).toBe('en')
  })

  test('without a cookie the browser language decides', () => {
    expect(initialLanguage(['ru-RU'])).toBe('ru')
  })

  test('a cookie value the app does not speak is ignored', () => {
    setCookie('de')
    expect(initialLanguage(['ru-RU'])).toBe('ru')
  })
})
