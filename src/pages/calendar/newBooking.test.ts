import { expect, test } from 'vitest'

import type { SlotsControllerSlots200Item } from '@/api/generated.schemas'
import { clientPhone, freeHoursSlots, slotAt } from './newBooking'

const slot = (
  startsAt: string,
  endsAt: string,
  extra: Partial<SlotsControllerSlots200Item> = {},
): SlotsControllerSlots200Item => ({
  staffId: 'vera',
  startsAt,
  endsAt,
  title: null,
  description: null,
  capacity: 1,
  booked: 0,
  full: false,
  groupId: null,
  oneOffSessionId: null,
  ...extra,
})

const ten = slot('2026-11-17T03:00:00Z', '2026-11-17T04:00:00Z') // 10:00 Bangkok
const group = slot('2026-11-17T05:00:00Z', '2026-11-17T06:00:00Z', {
  groupId: 'g',
})

test('only free hours are bookable here, meetings are not', () => {
  expect(freeHoursSlots([ten, group])).toEqual([ten])
})

test('a click on empty space finds the slot under it on the business clock', () => {
  const at = (staffId: string, date: string, minute: number) =>
    slotAt([ten, group], staffId, date, minute, 'Asia/Bangkok')
  expect(at('vera', '2026-11-17', 10 * 60 + 30)).toBe(ten)
  expect(at('vera', '2026-11-17', 11 * 60)).toBeUndefined() // the end is not inside
  expect(at('vera', '2026-11-17', 12 * 60 + 30)).toBeUndefined() // a meeting
  expect(at('petr', '2026-11-17', 10 * 60 + 30)).toBeUndefined()
  expect(at('vera', '2026-11-18', 10 * 60 + 30)).toBeUndefined()
})

test('a national number becomes the +E.164 the back wants', () => {
  expect(clientPhone('TH', '81 234 5678')).toBe('+66812345678')
  expect(clientPhone('TH', '12')).toBeUndefined()
  expect(clientPhone('TH', '')).toBeUndefined()
})
