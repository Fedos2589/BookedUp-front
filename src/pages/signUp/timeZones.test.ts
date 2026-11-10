import { expect, test } from 'vitest'

import { timeZoneOptions } from './timeZones'

test('lists the zones sorted, without duplicates', () => {
  expect(
    timeZoneOptions(['Europe/Moscow', 'Asia/Bangkok'], 'Asia/Bangkok'),
  ).toEqual(['Asia/Bangkok', 'Europe/Moscow'])
})

test("adds the browser's zone when the list lacks it (UTC is not in Intl's list)", () => {
  expect(timeZoneOptions(['Europe/Moscow'], 'UTC')).toEqual([
    'Europe/Moscow',
    'UTC',
  ])
})
