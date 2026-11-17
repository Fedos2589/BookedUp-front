import { addDays } from '@/dates'

export type CalendarView = 'day' | 'week'

// What the address says; what it leaves out the page fills in (the day view,
// today on the business's clock, the account's own master). All optional, so a
// plain link to /calendar needs no search.
export type CalendarSearch = {
  view?: CalendarView
  date?: string
  staffId?: string
}

const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i

// A real calendar day written YYYY-MM-DD (2026-02-30 is not one).
const dayOf = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return
  const moment = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(moment.getTime()) &&
    moment.toISOString().startsWith(value)
    ? value
    : undefined
}

export const calendarSearchOf = (
  search: Record<string, unknown>,
): CalendarSearch => ({
  view: search.view === 'week' ? 'week' : undefined,
  date: dayOf(search.date),
  staffId:
    typeof search.staffId === 'string' && UUID.test(search.staffId)
      ? search.staffId
      : undefined,
})

// One step of prev / next: a day in the day view, a week in the week view.
export const shiftDate = (
  date: string,
  view: CalendarView,
  direction: 1 | -1,
): string => addDays(date, direction * (view === 'week' ? 7 : 1))
