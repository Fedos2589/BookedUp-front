import { describe, expect, it } from 'vitest'

import { sessionSchema, toSessionBody, type SessionForm } from './sessionForm'

const valid: SessionForm = {
  title: ' Open day ',
  description: ' Boots ',
  date: '2026-11-19',
  startMinute: 15 * 60,
  endMinute: 16 * 60,
  capacity: '20',
}

const errorsOf = (form: SessionForm) => {
  const result = sessionSchema.safeParse(form)
  return result.success
    ? {}
    : Object.fromEntries(
        result.error.issues.map((i) => [i.path.join('.'), i.message]),
      )
}

describe('toSessionBody', () => {
  it('sends trimmed text, the instants in the business zone and the seats as a number', () => {
    expect(toSessionBody(sessionSchema.parse(valid), 'Asia/Bangkok')).toEqual({
      title: 'Open day',
      description: 'Boots',
      startsAt: '2026-11-19T08:00:00.000Z',
      endsAt: '2026-11-19T09:00:00.000Z',
      capacity: 20,
    })
  })

  it('an end before the start is the next day; an empty description is null', () => {
    const body = toSessionBody(
      sessionSchema.parse({
        ...valid,
        description: ' ',
        startMinute: 23 * 60,
        endMinute: 30,
      }),
      'Asia/Bangkok',
    )
    expect(body?.endsAt).toBe('2026-11-19T17:30:00.000Z')
    expect(body?.description).toBeNull()
  })

  it('is undefined for a zone this browser does not know', () => {
    expect(
      toSessionBody(sessionSchema.parse(valid), 'Mars/Olympus'),
    ).toBeUndefined()
  })
})

describe('sessionSchema', () => {
  it('accepts a valid form', () => {
    expect(errorsOf(valid)).toEqual({})
  })

  it('wants a day, like the group wants its title, times and seats', () => {
    expect(errorsOf({ ...valid, date: '' }).date).toBe('validation.required')
    expect(errorsOf({ ...valid, title: ' ' }).title).toBe('validation.required')
    expect(errorsOf({ ...valid, endMinute: 15 * 60 }).endMinute).toBe(
      'validation.endIsStart',
    )
    expect(errorsOf({ ...valid, capacity: '0' }).capacity).toBe(
      'validation.capacity',
    )
  })
})
