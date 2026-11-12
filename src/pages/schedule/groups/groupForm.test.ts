import { describe, expect, it } from 'vitest'

import { fromGroup, groupSchema, toBody, type GroupForm } from './groupForm'

const valid: GroupForm = {
  title: ' Football ',
  description: ' Boots\nWater ',
  weekdays: [4, 2],
  startMinute: 15 * 60,
  endMinute: 16 * 60,
  capacity: '12',
}

const errorsOf = (form: GroupForm) => {
  const result = groupSchema.safeParse(form)
  return result.success
    ? {}
    : Object.fromEntries(
        result.error.issues.map((i) => [i.path.join('.'), i.message]),
      )
}

describe('toBody', () => {
  it('sends trimmed text, sorted days, the length and the seats as a number', () => {
    expect(toBody(groupSchema.parse(valid))).toEqual({
      title: 'Football',
      description: 'Boots\nWater',
      weekdays: [2, 4],
      startMinute: 900,
      durationMinutes: 60,
      capacity: 12,
    })
  })

  it('an empty description is null', () => {
    expect(
      toBody(groupSchema.parse({ ...valid, description: '  ' })).description,
    ).toBeNull()
  })
})

describe('fromGroup', () => {
  it('is the form of a saved group, and back', () => {
    const group = {
      id: 'g',
      title: 'Football',
      description: null,
      weekdays: [2, 4],
      startMinute: 900,
      durationMinutes: 60,
      capacity: 12,
      cancellations: [],
    }
    const form = fromGroup(group)
    expect(form).toEqual({
      title: 'Football',
      description: '',
      weekdays: [2, 4],
      startMinute: 900,
      endMinute: 960,
      capacity: '12',
    })
    expect(toBody(groupSchema.parse(form))).toEqual({
      title: 'Football',
      description: null,
      weekdays: [2, 4],
      startMinute: 900,
      durationMinutes: 60,
      capacity: 12,
    })
  })
})

describe("groupSchema (the back's rules)", () => {
  it('accepts a valid form', () => {
    expect(errorsOf(valid)).toEqual({})
  })

  it('wants a title of 1–100 characters', () => {
    expect(errorsOf({ ...valid, title: '  ' }).title).toBe(
      'validation.required',
    )
    expect(errorsOf({ ...valid, title: 'a'.repeat(101) }).title).toBe(
      'validation.tooLong',
    )
    expect(errorsOf({ ...valid, title: 'a'.repeat(100) })).toEqual({})
  })

  it('wants a description of up to 2000 characters', () => {
    expect(
      errorsOf({ ...valid, description: 'a'.repeat(2001) }).description,
    ).toBe('validation.tooLong')
    expect(errorsOf({ ...valid, description: 'a'.repeat(2000) })).toEqual({})
  })

  it('wants a day, a start and an end', () => {
    expect(errorsOf({ ...valid, weekdays: [] }).weekdays).toBe(
      'validation.weekdays',
    )
    expect(errorsOf({ ...valid, startMinute: null }).startMinute).toBe(
      'validation.required',
    )
    expect(errorsOf({ ...valid, endMinute: null }).endMinute).toBe(
      'validation.required',
    )
  })

  it('wants the end after the start', () => {
    expect(errorsOf({ ...valid, endMinute: 15 * 60 }).endMinute).toBe(
      'validation.endAfterStart',
    )
    expect(errorsOf({ ...valid, endMinute: 14 * 60 }).endMinute).toBe(
      'validation.endAfterStart',
    )
  })

  it('wants whole seats from 1 to 1000', () => {
    for (const bad of ['', '0', '1001', '2.5', 'abc', '-1'])
      expect(errorsOf({ ...valid, capacity: bad }).capacity).toBe(
        'validation.capacity',
      )
    for (const good of ['1', '1000', ' 7 ']) {
      expect(errorsOf({ ...valid, capacity: good })).toEqual({})
    }
  })
})
