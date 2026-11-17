import { expect, test } from 'vitest'

import type {
  AppointmentsControllerList200Item,
  SlotsControllerSlots200Item,
  StaffControllerList200Item,
} from '@/api/generated.schemas'
import { toColumns } from './toColumns'

const timeZone = 'Asia/Bangkok' // UTC+7, no DST
const labels = {
  day: (date: string) => `day ${date}`,
  seats: (title: string | null, free: number, capacity: number) =>
    `${title ?? ''} ${free} of ${capacity}`,
  ended: (text: string) => `${text} (ended)`,
}
const now = new Date('2026-11-17T11:30:00Z') // inside the 18:00–19:00 meeting
const staff = (id: string, name: string): StaffControllerList200Item => ({
  id,
  name,
  userId: null,
  archived: false,
  scheduleMode: 'HOURS',
})
const vera = staff('vera', 'Vera')
const petr = staff('petr', 'Petr')

const booking = (
  over: Partial<AppointmentsControllerList200Item>,
): AppointmentsControllerList200Item => ({
  id: 'a1',
  staffId: 'vera',
  startsAt: '2026-11-17T03:00:00Z', // 10:00 in Bangkok
  endsAt: '2026-11-17T04:00:00Z',
  status: 'BOOKED',
  clientName: 'Olga',
  clientPhone: '+66000000',
  note: null,
  groupId: null,
  oneOffSessionId: null,
  ...over,
})
const meeting = (
  over: Partial<SlotsControllerSlots200Item>,
): SlotsControllerSlots200Item => ({
  staffId: 'vera',
  startsAt: '2026-11-17T11:00:00Z', // 18:00
  endsAt: '2026-11-17T12:00:00Z',
  title: 'Judo',
  description: null,
  capacity: 8,
  booked: 3,
  full: false,
  groupId: 'g1',
  oneOffSessionId: null,
  ...over,
})

test('the day view: a column per master with the bookings of that master', () => {
  const columns = toColumns({
    range: { view: 'day', date: '2026-11-17', staff: [vera, petr] },
    appointments: [booking({}), booking({ id: 'a2', staffId: 'petr' })],
    slots: [],
    timeZone,
    now,
    labels,
  })
  expect(columns.map((c) => [c.id, c.label])).toEqual([
    ['vera', 'Vera'],
    ['petr', 'Petr'],
  ])
  expect(columns[0].items).toEqual([
    {
      id: 'a1',
      startMinute: 600,
      endMinute: 660,
      children: 'Olga',
      colorScheme: 'blue',
    },
  ])
  expect(columns[1].items.map((i) => i.id)).toEqual(['a2'])
})

test('the week view: a column per day of one master', () => {
  const dates = ['2026-11-16', '2026-11-17', '2026-11-18']
  const columns = toColumns({
    range: { view: 'week', dates, master: vera },
    appointments: [booking({}), booking({ id: 'x', staffId: 'petr' })],
    slots: [],
    timeZone,
    now,
    labels,
  })
  expect(columns.map((c) => [c.id, c.label])).toEqual(
    dates.map((d) => [d, `day ${d}`]),
  )
  expect(columns.map((c) => c.items.length)).toEqual([0, 1, 0])
})

test('a booking at 23:30 UTC lands on the next local day, by the business clock', () => {
  const [column] = toColumns({
    range: { view: 'day', date: '2026-11-18', staff: [vera] },
    appointments: [
      booking({
        startsAt: '2026-11-17T23:30:00Z',
        endsAt: '2026-11-18T00:30:00Z',
      }),
    ],
    slots: [],
    timeZone,
    now,
    labels,
  })
  expect(column.items[0]).toMatchObject({ startMinute: 390, endMinute: 450 })
})

test('a booking running past midnight ends at 1440 in the column it starts in', () => {
  const [column] = toColumns({
    range: { view: 'day', date: '2026-11-17', staff: [vera] },
    appointments: [
      booking({
        startsAt: '2026-11-17T16:30:00Z', // 23:30
        endsAt: '2026-11-17T17:30:00Z', // 00:30 next day
      }),
    ],
    slots: [],
    timeZone,
    now,
    labels,
  })
  expect(column.items[0]).toMatchObject({ startMinute: 1410, endMinute: 1440 })
})

test('a group meeting shows its free seats; its seats and free hours are not items', () => {
  const [column] = toColumns({
    range: { view: 'day', date: '2026-11-17', staff: [vera] },
    appointments: [booking({ id: 'seat', groupId: 'g1' })],
    slots: [
      meeting({}),
      meeting({ groupId: null, startsAt: '2026-11-17T05:00:00Z' }), // free hours
    ],
    timeZone,
    now,
    labels,
  })
  expect(column.items).toHaveLength(1)
  expect(column.items[0]).toMatchObject({
    startMinute: 1080,
    endMinute: 1140,
    children: 'Judo 5 of 8',
  })
})

test('a full meeting reads 0 free; an over-booked one never goes negative', () => {
  const [column] = toColumns({
    range: { view: 'day', date: '2026-11-17', staff: [vera] },
    appointments: [],
    slots: [meeting({ booked: 10, full: true })],
    timeZone,
    now,
    labels,
  })
  expect(column.items[0].children).toBe('Judo 0 of 8')
})

test('status sets the colour', () => {
  const [column] = toColumns({
    range: { view: 'day', date: '2026-11-17', staff: [vera] },
    appointments: [
      booking({ id: 'c', status: 'CONFIRMED' }),
      booking({ id: 'd', status: 'DONE' }),
      booking({ id: 'n', status: 'NO_SHOW' }),
    ],
    slots: [],
    timeZone,
    now,
    labels,
  })
  expect(column.items.map((i) => i.colorScheme)).toEqual([
    'green',
    'grey',
    'red',
  ])
})

test('a clock change: minutes are the wall clock of the business, not UTC', () => {
  // Berlin, 2026-03-29: 02:00 CET jumps to 03:00 CEST.
  const [column] = toColumns({
    range: { view: 'day', date: '2026-03-29', staff: [vera] },
    appointments: [
      booking({
        startsAt: '2026-03-29T00:30:00Z', // 01:30 CET
        endsAt: '2026-03-29T01:30:00Z', // 03:30 CEST
      }),
    ],
    slots: [],
    timeZone: 'Europe/Berlin',
    now,
    labels,
  })
  expect(column.items[0]).toMatchObject({ startMinute: 90, endMinute: 210 })
})

test('an ended meeting is faded and says so; one in progress is not', () => {
  const [column] = toColumns({
    range: { view: 'day', date: '2026-11-17', staff: [vera] },
    appointments: [],
    slots: [
      meeting({
        groupId: 'over',
        startsAt: '2026-11-17T08:00:00Z',
        endsAt: '2026-11-17T09:00:00Z',
      }),
      meeting({}),
    ],
    timeZone,
    now,
    labels,
  })
  expect(column.items[0]).toMatchObject({
    faded: true,
    children: 'Judo 5 of 8 (ended)',
  })
  expect(column.items[1].faded).toBeFalsy()
  expect(column.items[1].children).toBe('Judo 5 of 8')
})

test('a meeting ending exactly now is over', () => {
  const [column] = toColumns({
    range: { view: 'day', date: '2026-11-17', staff: [vera] },
    appointments: [],
    slots: [meeting({})],
    timeZone,
    now: new Date('2026-11-17T12:00:00Z'),
    labels,
  })
  expect(column.items[0].faded).toBe(true)
})
