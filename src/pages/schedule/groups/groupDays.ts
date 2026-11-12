import { addDays } from '@/dates'

// ISO weekday (1 = Monday … 7 = Sunday) of a calendar day.
const weekdayOf = (date: string) =>
  ((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7) + 1

// The next `count` days, today included, on which the group meets and the
// session is not cancelled — the only days the back lets be cancelled (else 400).
export function nextMeetings(
  group: { weekdays: number[]; cancellations: string[] },
  today: string,
  count: number,
): string[] {
  if (group.weekdays.length === 0) return []
  const found: string[] = []
  for (let day = today; found.length < count; day = addDays(day, 1)) {
    if (
      group.weekdays.includes(weekdayOf(day)) &&
      !group.cancellations.includes(day)
    ) {
      found.push(day)
    }
  }
  return found
}

// The cancelled days that have not passed, soonest first (dates sort as text).
export const cancelledFrom = (cancellations: string[], today: string) =>
  cancellations.filter((d) => d >= today).sort()
