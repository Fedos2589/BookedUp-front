import { expect, test } from 'vitest'

import { nextOffset, rowsOf } from './paging'

const page = (ids: string[], total: number) => ({
  items: ids.map((id) => ({ id })),
  total,
})

test('the next offset is the number of rows shown, until all are', () => {
  const first = page(['a', 'b'], 3)
  expect(nextOffset(first, [first])).toBe(2)
  const second = page(['c'], 3)
  expect(nextOffset(second, [first, second])).toBeUndefined()
})

test('an empty page ends the paging even if the total says more', () => {
  const empty = page([], 5)
  expect(nextOffset(empty, [empty])).toBeUndefined()
})

test('a row repeated by a shifted offset is kept once', () => {
  expect(
    rowsOf([page(['a', 'b'], 3), page(['b', 'c'], 3)]).map((r) => r.id),
  ).toEqual(['a', 'b', 'c'])
})
