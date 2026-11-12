import { describe, expect, it } from 'vitest'

import { cancelProblem } from './groupDays'

// 2026-11-17 is a Tuesday.
const tueThu = { weekdays: [2, 4], cancellations: ['2026-11-26'] }

describe('cancelProblem', () => {
  it('is none for a day the group meets and has not cancelled', () => {
    expect(cancelProblem(tueThu, '2026-11-17')).toBeUndefined()
    expect(cancelProblem(tueThu, '2027-11-16')).toBeUndefined()
  })

  it('is notMeeting for any other weekday', () => {
    expect(cancelProblem(tueThu, '2026-11-18')).toBe('notMeeting')
  })

  it('is cancelled for a day already cancelled', () => {
    expect(cancelProblem(tueThu, '2026-11-26')).toBe('cancelled')
  })

  it('Sunday is 7', () => {
    expect(
      cancelProblem({ weekdays: [7], cancellations: [] }, '2026-11-22'),
    ).toBeUndefined()
    expect(
      cancelProblem({ weekdays: [7], cancellations: [] }, '2026-11-16'),
    ).toBe('notMeeting')
  })
})
