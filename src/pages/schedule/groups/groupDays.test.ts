import { describe, expect, it } from 'vitest'

import { cancelledFrom, nextMeetings } from './groupDays'

// 2026-11-16 is a Monday.
const tueThu = { weekdays: [2, 4], cancellations: [] as string[] }

describe('nextMeetings', () => {
  it('lists the days the group meets, from today on, today included', () => {
    expect(nextMeetings(tueThu, '2026-11-17', 3)).toEqual([
      '2026-11-17',
      '2026-11-19',
      '2026-11-24',
    ])
  })

  it('starts on the next meeting when today is not one', () => {
    expect(nextMeetings(tueThu, '2026-11-16', 1)).toEqual(['2026-11-17'])
  })

  it('skips the days already cancelled', () => {
    expect(
      nextMeetings(
        { ...tueThu, cancellations: ['2026-11-19'] },
        '2026-11-17',
        3,
      ),
    ).toEqual(['2026-11-17', '2026-11-24', '2026-11-26'])
  })

  it('Sunday is 7', () => {
    expect(
      nextMeetings({ weekdays: [7], cancellations: [] }, '2026-11-16', 1),
    ).toEqual(['2026-11-22'])
  })

  it('a group without days meets never', () => {
    expect(
      nextMeetings({ weekdays: [], cancellations: [] }, '2026-11-16', 3),
    ).toEqual([])
  })
})

describe('cancelledFrom', () => {
  it('keeps the cancelled days from today on, in order', () => {
    expect(
      cancelledFrom(['2026-12-01', '2026-11-10', '2026-11-17'], '2026-11-17'),
    ).toEqual(['2026-11-17', '2026-12-01'])
  })
})
