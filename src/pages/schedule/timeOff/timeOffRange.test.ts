import { describe, expect, it } from 'vitest'

import { rangeOfInstants, instantsOfRange } from './timeOffRange'

describe('instantsOfRange', () => {
  it('runs from the first midnight to the midnight after the last day', () => {
    expect(instantsOfRange('2026-11-16', '2026-11-20', 'Asia/Bangkok')).toEqual(
      {
        startsAt: '2026-11-15T17:00:00.000Z',
        endsAt: '2026-11-20T17:00:00.000Z',
      },
    )
  })

  it('a single day is 24 hours', () => {
    expect(instantsOfRange('2026-11-16', '2026-11-16', 'UTC')).toEqual({
      startsAt: '2026-11-16T00:00:00.000Z',
      endsAt: '2026-11-17T00:00:00.000Z',
    })
  })

  it('keeps midnights across the spring DST change (Berlin, 2026-03-29)', () => {
    expect(
      instantsOfRange('2026-03-28', '2026-03-29', 'Europe/Berlin'),
    ).toEqual({
      startsAt: '2026-03-27T23:00:00.000Z', // CET, +1
      endsAt: '2026-03-29T22:00:00.000Z', // the day after is CEST, +2
    })
  })

  it('keeps midnights across the autumn DST change (Berlin, 2026-10-25)', () => {
    expect(
      instantsOfRange('2026-10-24', '2026-10-25', 'Europe/Berlin'),
    ).toEqual({
      startsAt: '2026-10-23T22:00:00.000Z', // CEST, +2
      endsAt: '2026-10-25T23:00:00.000Z', // the day after is CET, +1
    })
  })

  it('crosses a month and a leap day', () => {
    expect(instantsOfRange('2028-02-28', '2028-02-29', 'UTC')).toEqual({
      startsAt: '2028-02-28T00:00:00.000Z',
      endsAt: '2028-03-01T00:00:00.000Z',
    })
  })

  it('is undefined for a zone this browser does not know', () => {
    expect(
      instantsOfRange('2026-11-16', '2026-11-16', 'Not/AZone'),
    ).toBeUndefined()
  })
})

describe('rangeOfInstants', () => {
  it('reads whole days back, both ends inclusive', () => {
    expect(
      rangeOfInstants(
        '2026-03-27T23:00:00.000Z',
        '2026-03-29T22:00:00.000Z',
        'Europe/Berlin',
      ),
    ).toEqual({ kind: 'days', from: '2026-03-28', to: '2026-03-29' })
  })

  it('round-trips with instantsOfRange', () => {
    const { startsAt, endsAt } = instantsOfRange(
      '2026-10-24',
      '2026-10-26',
      'Europe/Berlin',
    )!
    expect(rangeOfInstants(startsAt, endsAt, 'Europe/Berlin')).toEqual({
      kind: 'days',
      from: '2026-10-24',
      to: '2026-10-26',
    })
  })

  it('a record off the midnights is times, not days', () => {
    expect(
      rangeOfInstants(
        '2026-11-16T05:30:00.000Z',
        '2026-11-16T10:00:00.000Z',
        'UTC',
      ),
    ).toEqual({
      kind: 'times',
      startsAt: new Date('2026-11-16T05:30:00.000Z'),
      endsAt: new Date('2026-11-16T10:00:00.000Z'),
    })
  })

  it('midnight start but a mid-day end is times', () => {
    expect(
      rangeOfInstants(
        '2026-11-16T00:00:00.000Z',
        '2026-11-16T12:00:00.000Z',
        'UTC',
      ).kind,
    ).toBe('times')
  })

  it('midnight start but a mid-day end days later is times too', () => {
    expect(
      rangeOfInstants(
        '2026-11-16T00:00:00.000Z',
        '2026-11-18T12:00:00.000Z',
        'UTC',
      ).kind,
    ).toBe('times')
  })

  it('a day whose midnight DST skips is still a whole day (Santiago, 2026-09-06)', () => {
    // Clocks go 00:00 -> 01:00 that night: the day opens at 01:00 local.
    expect(
      rangeOfInstants(
        '2026-09-06T04:00:00.000Z',
        '2026-09-07T03:00:00.000Z',
        'America/Santiago',
      ),
    ).toEqual({ kind: 'days', from: '2026-09-06', to: '2026-09-06' })
    expect(
      instantsOfRange('2026-09-06', '2026-09-06', 'America/Santiago'),
    ).toEqual({
      startsAt: '2026-09-06T04:00:00.000Z',
      endsAt: '2026-09-07T03:00:00.000Z',
    })
  })

  it('is times for a zone this browser does not know', () => {
    expect(
      rangeOfInstants(
        '2026-11-16T00:00:00.000Z',
        '2026-11-17T00:00:00.000Z',
        'Not/AZone',
      ).kind,
    ).toBe('times')
  })
})
