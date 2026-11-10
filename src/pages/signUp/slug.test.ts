import { expect, test } from 'vitest'

import { SLUG_MAX_LENGTH, SLUG_PATTERN, slugFromName } from './slug'

test.each([
  ['Judo Kids', 'judo-kids'],
  ['Студия Красоты', 'studiya-krasoty'],
  ['Щука и Ёж', 'shchuka-i-yozh'],
  ['  Café — Crème!! 24/7 ', 'cafe-creme-24-7'],
  ['Подъезд №5', 'podezd-no5'],
  // Review #8: Ukrainian letters (и stays i, as in Russian) and NFD input,
  // as pasted from macOS (й = и + U+0306).
  ['Київ Єва Ґанок', 'kiyiv-yeva-ganok'],
  ['Мой'.normalize('NFD'), 'moy'],
  ['---', ''],
  ['สปา', ''],
])('%j → %j', (name, slug) => {
  expect(slugFromName(name)).toBe(slug)
})

test('a long name is cut to the limit without a trailing hyphen', () => {
  const slug = slugFromName(`${'a'.repeat(62)} bcd`)

  expect(slug).toBe('a'.repeat(62))
  expect(slug.length).toBeLessThanOrEqual(SLUG_MAX_LENGTH)
})

test('every non-empty result is a slug the back accepts', () => {
  for (const name of [
    'Judo Kids',
    'Студия Красоты',
    'Café 24/7',
    'x'.repeat(80),
  ]) {
    expect(slugFromName(name)).toMatch(SLUG_PATTERN)
  }
})
