import type {
  ScheduleGridColumn,
  ScheduleGridItem,
  ScheduleGridItemColorScheme,
} from 'ted-ui/ScheduleGrid'

import type {
  AppointmentsControllerList200Item,
  SlotsControllerSlots200Item,
  StaffControllerList200Item,
} from '@/api/generated.schemas'
import { localMoment } from '@/dates'

export type CalendarLabels = {
  day: (date: string) => string
  seats: (title: string | null, free: number, capacity: number) => string
}

const colorOf: Record<
  AppointmentsControllerList200Item['status'],
  ScheduleGridItemColorScheme
> = {
  BOOKED: 'blue',
  CONFIRMED: 'green',
  DONE: 'grey',
  NO_SHOW: 'red',
  CANCELLED: 'grey',
}

// Where something sits in the column of the day it starts in: its start, and
// its end, which stops at midnight when it runs past (1440 — the grid's 24:00).
function placeOf(startsAt: string, endsAt: string, timeZone: string) {
  const start = localMoment(startsAt, timeZone)
  const end = localMoment(endsAt, timeZone)
  if (!start || !end) return undefined
  return {
    date: start.date,
    startMinute: start.minute,
    endMinute: end.date === start.date ? end.minute : 1440,
  }
}

// Every booking and meeting once, filed under the master and the day it starts.
function itemsByColumn(
  appointments: AppointmentsControllerList200Item[],
  slots: SlotsControllerSlots200Item[],
  timeZone: string,
  labels: CalendarLabels,
) {
  const byColumn = new Map<string, ScheduleGridItem[]>()
  const add = (
    staffId: string,
    startsAt: string,
    endsAt: string,
    item: (p: { startMinute: number; endMinute: number }) => ScheduleGridItem,
  ) => {
    const place = placeOf(startsAt, endsAt, timeZone)
    if (!place) return
    const key = `${staffId}|${place.date}`
    byColumn.set(key, [...(byColumn.get(key) ?? []), item(place)])
  }
  for (const a of appointments) {
    // A seat is shown inside its meeting, not as a booking of its own.
    if (a.groupId || a.oneOffSessionId) continue
    add(a.staffId, a.startsAt, a.endsAt, (place) => ({
      id: a.id,
      startMinute: place.startMinute,
      endMinute: place.endMinute,
      children: a.clientName,
      colorScheme: colorOf[a.status],
    }))
  }
  for (const s of slots) {
    // Free hours are empty space in the grid; only meetings are items.
    const meetingId = s.groupId ?? s.oneOffSessionId
    if (!meetingId) continue
    add(s.staffId, s.startsAt, s.endsAt, (place) => ({
      id: `${meetingId}@${s.startsAt}`,
      startMinute: place.startMinute,
      endMinute: place.endMinute,
      children: labels.seats(
        s.title,
        Math.max(s.capacity - s.booked, 0),
        s.capacity,
      ),
      colorScheme: s.full ? 'grey' : 'blue',
    }))
  }
  return byColumn
}

// What the grid shows: a day of several masters, or the days of one master.
export type CalendarRange =
  | { view: 'day'; date: string; staff: StaffControllerList200Item[] }
  | { view: 'week'; dates: string[]; master: StaffControllerList200Item }

// Bookings and meetings of a range as the kit grid's columns: the day view has
// a column per master, the week view a column per date. Times come from the
// business's clock, not the browser's.
export function toColumns({
  range,
  appointments,
  slots,
  timeZone,
  labels,
}: {
  range: CalendarRange
  appointments: AppointmentsControllerList200Item[]
  slots: SlotsControllerSlots200Item[]
  timeZone: string
  labels: CalendarLabels
}): ScheduleGridColumn[] {
  const items = itemsByColumn(appointments, slots, timeZone, labels)
  const column = (
    id: string,
    label: string,
    staffId: string,
    date: string,
  ) => ({
    id,
    label,
    items: items.get(`${staffId}|${date}`) ?? [],
  })
  return range.view === 'day'
    ? range.staff.map((s) => column(s.id, s.name, s.id, range.date))
    : range.dates.map((d) => column(d, labels.day(d), range.master.id, d))
}
