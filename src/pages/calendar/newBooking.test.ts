import { expect, test } from 'vitest'

import type { SlotsControllerSlots200Item } from '@/api/generated.schemas'
import {
  chosenSlot,
  clientPhone,
  freeHoursSlots,
  freeSlotsOf,
  slotAt,
  slotKey,
} from './newBooking'

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

test('a free hour that has started is no longer bookable', () => {
  const now = new Date('2026-11-17T03:00:01Z')
  expect(freeHoursSlots([ten], now)).toEqual([])
})

test('only free hours are bookable here, meetings are not', () => {
  expect(
    freeHoursSlots([ten, group], new Date('2026-11-17T00:00:00Z')),
  ).toEqual([ten])
})

test('a click on empty space finds the slot under it on the business clock', () => {
  const at = (staffId: string, date: string, minute: number) =>
    slotAt([ten], staffId, date, minute, 'Asia/Bangkok')
  expect(at('vera', '2026-11-17', 10 * 60 + 30)).toBe(ten)
  expect(at('vera', '2026-11-17', 11 * 60)).toBeUndefined() // the end is not inside
  expect(at('petr', '2026-11-17', 10 * 60 + 30)).toBeUndefined()
  expect(at('vera', '2026-11-18', 10 * 60 + 30)).toBeUndefined()
})

test('a national number becomes the +E.164 the back wants', () => {
  expect(clientPhone('TH', '81 234 5678')).toBe('+66812345678')
  expect(clientPhone('TH', '12')).toBeUndefined()
  expect(clientPhone('TH', '')).toBeUndefined()
})

test('free slots of the masters on screen: ahead of now, a master with a column', () => {
  const other = slot('2026-11-17T03:00:00Z', '2026-11-17T04:00:00Z', {
    staffId: 'olga',
  })
  const now = new Date('2026-11-17T02:00:00Z')
  expect(freeSlotsOf([ten, group, other], [{ id: 'vera' }], now)).toEqual([ten])
})

test('a chosen slot is found by key; one taken meanwhile leaves nothing chosen', () => {
  const next = slot('2026-11-17T04:00:00Z', '2026-11-17T05:00:00Z')
  expect(chosenSlot([ten, next], slotKey(next))).toBe(next)
  expect(chosenSlot([next], slotKey(ten))).toBeUndefined()
})
