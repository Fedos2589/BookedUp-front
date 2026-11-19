import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { detectLanguage, initialLanguage, saveLanguage } from './language'

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

describe('chosen language', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  test('a saved choice wins over the browser language', () => {
    saveLanguage('en')
    expect(initialLanguage(['ru-RU'])).toBe('en')
  })

  test('without a choice the browser language decides', () => {
    expect(initialLanguage(['ru-RU'])).toBe('ru')
  })

  test('a stored value the app does not speak is ignored', () => {
    localStorage.setItem('language', 'de')
    expect(initialLanguage(['ru-RU'])).toBe('ru')
  })

  test('unavailable storage does not break reading or saving', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(initialLanguage(['ru-RU'])).toBe('ru')
    expect(() => saveLanguage('en')).not.toThrow()
  })
})
