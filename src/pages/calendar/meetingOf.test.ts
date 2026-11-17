import { expect, test } from 'vitest'

import type {
  AppointmentsControllerList200Item as Appointment,
  SlotsControllerSlots200Item as Slot,
} from '@/api/generated.schemas'
import { meetingOf } from './meetingOf'

const startsAt = '2026-11-17T11:00:00Z'
const judo: Slot = {
  staffId: 'vera',
  startsAt,
  endsAt: '2026-11-17T12:00:00Z',
  title: 'Judo',
  description: null,
  capacity: 8,
  booked: 2,
  full: false,
  groupId: 'g1',
  oneOffSessionId: null,
}
const seat = (id: string, extra: Partial<Appointment>): Appointment => ({
  id,
  staffId: 'vera',
  startsAt,
  endsAt: judo.endsAt,
  status: 'BOOKED',
  clientName: id,
  clientPhone: '+66000000',
  note: null,
  groupId: 'g1',
  oneOffSessionId: null,
  ...extra,
})

test('an item id finds its meeting and the seats booked at that very time', () => {
  const later = { ...judo, startsAt: '2026-11-24T11:00:00Z' }
  const found = meetingOf(
    `g1@${startsAt}`,
    [judo, later],
    [
      seat('Olga', {}),
      seat('Next week', { startsAt: later.startsAt }),
      seat('Other group', { groupId: 'g2' }),
      seat('Hours client', { groupId: null }),
      seat('Gone', { status: 'CANCELLED' }),
    ],
  )
  expect(found?.slot).toBe(judo)
  expect(found?.bookings.map((b) => b.clientName)).toEqual(['Olga'])
})

test('a one-off session is found by its own id', () => {
  const once = { ...judo, groupId: null, oneOffSessionId: 's1' }
  const found = meetingOf(
    `s1@${startsAt}`,
    [once],
    [seat('Ivan', { groupId: null, oneOffSessionId: 's1' })],
  )
  expect(found?.bookings.map((b) => b.clientName)).toEqual(['Ivan'])
})

test('a booking item or a meeting that is gone is not a meeting', () => {
  expect(meetingOf('some-booking-id', [judo], [])).toBeUndefined()
  expect(meetingOf(`g9@${startsAt}`, [judo], [])).toBeUndefined()
})
