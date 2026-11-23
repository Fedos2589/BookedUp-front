import { expect, test } from 'vitest'

import type { PublicBookingControllerSlots200Item as Slot } from '@/api/generated.schemas'
import { ANY_MASTER } from './bookingSearch'
import { slotsForPicker } from './slotsForPicker'

const ANNA = '11111111-1111-4111-8111-111111111111'
const BORIS = '22222222-2222-4222-8222-222222222222'
const CARA = '33333333-3333-4333-8333-333333333333'
const masters = [
  { id: ANNA, name: 'Anna', scheduleMode: 'HOURS' },
  { id: BORIS, name: 'Boris', scheduleMode: 'HOURS' },
  { id: CARA, name: 'Cara', scheduleMode: 'GROUPS' },
] as const

const slot = (staffId: string, startsAt: string, over: Partial<Slot> = {}) =>
  ({
    staffId,
    startsAt,
    endsAt: new Date(Date.parse(startsAt) + 3_600_000).toISOString(),
    title: null,
    description: null,
    capacity: 1,
    booked: 0,
    full: false,
    groupId: null,
    oneOffSessionId: null,
    ...over,
  }) as Slot

const view = (
  slots: Slot[],
  staff: string,
  timeZone = 'Europe/Berlin',
  today = '2026-11-23',
) =>
  slotsForPicker({
    slots,
    staff,
    timeZone,
    masters: [...masters],
    today,
    language: 'en',
  })

const day = (days: ReturnType<typeof view>, date: string) =>
  days.find((d) => d.date === date)!

test('covers the 14 days from today, each with weekday and number', () => {
  const days = view([], ANNA)
  expect(days).toHaveLength(14)
  expect(days[0]).toMatchObject({
    date: '2026-11-23',
    weekday: 'Mon',
    number: '23',
    slots: [],
  })
  expect(days[13].date).toBe('2026-12-06')
})

test('two masters free at 10:00 are one button for "any"', () => {
  const at = '2026-11-24T09:00:00.000Z' // 10:00 in Berlin
  const { slots } = day(
    view([slot(ANNA, at), slot(BORIS, at)], ANY_MASTER),
    '2026-11-24',
  )
  expect(slots).toHaveLength(1)
  expect(slots[0]).toMatchObject({ time: '10:00', staffId: '' })
})

test('a master\'s own times keep their master in the key; "any" leaves it empty', () => {
  const at = '2026-11-24T09:00:00.000Z'
  const own = day(view([slot(ANNA, at)], ANNA), '2026-11-24').slots[0]
  const any = day(view([slot(ANNA, at)], ANY_MASTER), '2026-11-24').slots[0]
  expect(own.id.startsWith(`${ANNA}|`)).toBe(true)
  expect(any.id.startsWith('|')).toBe(true)
})

test('"any" shows a meeting on its own, with its title and master', () => {
  const at = '2026-11-24T09:00:00.000Z'
  const meeting = slot(CARA, at, {
    title: 'Football',
    capacity: 10,
    booked: 7,
    groupId: 'g1',
  })
  const { slots } = day(
    view([slot(ANNA, at), meeting], ANY_MASTER),
    '2026-11-24',
  )
  expect(slots).toHaveLength(2)
  expect(slots.find((s) => s.title === 'Football')).toMatchObject({
    master: 'Cara',
    free: { left: 3, of: 10 },
    full: false,
  })
})

test("a master's own full meeting is shown, disabled", () => {
  const at = '2026-11-24T09:00:00.000Z'
  const full = slot(CARA, at, {
    title: 'Football',
    capacity: 2,
    booked: 2,
    full: true,
    groupId: 'g1',
  })
  const { slots } = day(view([full], CARA), '2026-11-24')
  expect(slots).toHaveLength(1)
  expect(slots[0]).toMatchObject({ full: true, free: { left: 0, of: 2 } })
})

test('a full hours slot is not offered for "any"', () => {
  const at = '2026-11-24T09:00:00.000Z'
  const { slots } = day(
    view([slot(ANNA, at, { full: true })], ANY_MASTER),
    '2026-11-24',
  )
  expect(slots).toEqual([])
})

test("days and times are the business's, also across a DST change (Berlin, 25 Oct 2026)", () => {
  // 00:30 CEST on the 25th, then 00:30 CET on the 26th (the clock went back).
  const days = slotsForPicker({
    slots: [
      slot(ANNA, '2026-10-24T22:30:00.000Z'),
      slot(ANNA, '2026-10-25T23:30:00.000Z'),
    ],
    staff: ANNA,
    timeZone: 'Europe/Berlin',
    masters: [...masters],
    today: '2026-10-24',
    language: 'en',
  })
  expect(
    days.find((d) => d.date === '2026-10-25')!.slots.map((s) => s.time),
  ).toEqual(['00:30'])
  expect(
    days.find((d) => d.date === '2026-10-26')!.slots.map((s) => s.time),
  ).toEqual(['00:30'])
})

test('a meeting names its master only for "any"; a chosen master is already known', () => {
  const at = '2026-11-24T09:00:00.000Z'
  const meeting = slot(CARA, at, {
    title: 'Football',
    capacity: 10,
    booked: 7,
    groupId: 'g1',
  })
  expect(day(view([meeting], CARA), '2026-11-24').slots[0].master).toBeNull()
  expect(day(view([meeting], ANY_MASTER), '2026-11-24').slots[0].master).toBe(
    'Cara',
  )
})
