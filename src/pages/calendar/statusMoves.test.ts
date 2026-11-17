import { expect, test } from 'vitest'

import { statusMoves } from './statusMoves'

test('before the start a booking can be confirmed or cancelled, not marked done or missed', () => {
  expect(statusMoves('BOOKED', false)).toEqual(['CONFIRMED', 'CANCELLED'])
  expect(statusMoves('CONFIRMED', false)).toEqual(['CANCELLED'])
})

test('once started it can also be done or a no-show, from booked too', () => {
  expect(statusMoves('BOOKED', true)).toEqual([
    'CONFIRMED',
    'DONE',
    'NO_SHOW',
    'CANCELLED',
  ])
  expect(statusMoves('CONFIRMED', true)).toEqual([
    'DONE',
    'NO_SHOW',
    'CANCELLED',
  ])
})

test('a finished booking has no moves left', () => {
  for (const status of ['DONE', 'NO_SHOW', 'CANCELLED'] as const)
    expect(statusMoves(status, true)).toEqual([])
})
