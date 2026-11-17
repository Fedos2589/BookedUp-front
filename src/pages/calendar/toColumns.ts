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
import type { CalendarView } from './calendarSearch'

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

const itemsOf = (
  staffId: string,
  date: string,
  appointments: AppointmentsControllerList200Item[],
  slots: SlotsControllerSlots200Item[],
  timeZone: string,
  labels: CalendarLabels,
): ScheduleGridItem[] => {
  const items: ScheduleGridItem[] = []
  for (const a of appointments) {
    // A seat is shown inside its meeting, not as a booking of its own.
    if (a.staffId !== staffId || a.groupId || a.oneOffSessionId) continue
    const place = placeOf(a.startsAt, a.endsAt, timeZone)
    if (place?.date !== date) continue
    items.push({
      id: a.id,
      startMinute: place.startMinute,
      endMinute: place.endMinute,
      children: a.clientName,
      colorScheme: colorOf[a.status],
    })
  }
  for (const s of slots) {
    // Free hours are empty space in the grid; only meetings are items.
    const meetingId = s.groupId ?? s.oneOffSessionId
    if (s.staffId !== staffId || !meetingId) continue
    const place = placeOf(s.startsAt, s.endsAt, timeZone)
    if (place?.date !== date) continue
    items.push({
      id: `${meetingId}@${s.startsAt}`,
      startMinute: place.startMinute,
      endMinute: place.endMinute,
      children: labels.seats(
        s.title,
        Math.max(s.capacity - s.booked, 0),
        s.capacity,
      ),
      colorScheme: s.full ? 'grey' : 'blue',
    })
  }
  return items
}

// Bookings and meetings of a range as the kit grid's columns: the day view has
// a column per master (of its one date), the week view a column per date (of
// its one master). Times come from the business's clock, not the browser's.
export function toColumns({
  view,
  dates,
  staff,
  appointments,
  slots,
  timeZone,
  labels,
}: {
  view: CalendarView
  dates: string[]
  staff: StaffControllerList200Item[]
  appointments: AppointmentsControllerList200Item[]
  slots: SlotsControllerSlots200Item[]
  timeZone: string
  labels: CalendarLabels
}): ScheduleGridColumn[] {
  const column = (
    id: string,
    label: string,
    staffId: string,
    date: string,
  ) => ({
    id,
    label,
    items: itemsOf(staffId, date, appointments, slots, timeZone, labels),
  })
  return view === 'day'
    ? staff.map((s) => column(s.id, s.name, s.id, dates[0]))
    : staff.length > 0
      ? dates.map((d) => column(d, labels.day(d), staff[0].id, d))
      : []
}
