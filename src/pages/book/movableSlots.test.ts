import { expect, test } from 'vitest'

import type { PublicBookingControllerSlots200Item as Slot } from '@/api/generated.schemas'
import { movableSlots } from './movableSlots'

// Review of #49 — finding 9: a booking moves to another time of the same kind.
const slot = (over: Partial<Slot> = {}): Slot => ({
  staffId: 'anna',
  startsAt: '2026-11-25T09:00:00.000Z',
  endsAt: '2026-11-25T10:00:00.000Z',
  title: null,
  description: null,
  capacity: 1,
  booked: 0,
  full: false,
  groupId: null,
  oneOffSessionId: null,
  ...over,
})

const hours = slot()
const group = slot({ groupId: 'g1', title: 'Judo' })
const otherGroup = slot({ groupId: 'g2', title: 'Sambo' })
const oneOff = slot({ oneOffSessionId: 's1', title: 'Camp' })
const all = [hours, group, otherGroup, oneOff]

const booking = (over = {}) => ({
  startsAt: '2026-11-24T09:00:00.000Z',
  endsAt: '2026-11-24T10:00:00.000Z',
  groupId: null,
  oneOffSessionId: null,
  ...over,
})

test('an hours booking moves among hours only', () => {
  expect(movableSlots(all, booking())).toEqual([hours])
})

test('a group booking moves among the times of its own group', () => {
  expect(movableSlots(all, booking({ groupId: 'g1' }))).toEqual([group])
})

test('a one-off booking moves among one-off sessions', () => {
  expect(movableSlots(all, booking({ oneOffSessionId: 's9' }))).toEqual([
    oneOff,
  ])
})

test('the booking’s own time is not offered', () => {
  const own = slot({
    startsAt: '2026-11-24T09:00:00.000Z',
    endsAt: '2026-11-24T10:00:00.000Z',
  })
  expect(movableSlots([own, hours], booking())).toEqual([hours])
})
