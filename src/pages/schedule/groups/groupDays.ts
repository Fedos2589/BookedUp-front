import { isoWeekday } from '@/dates'

// Why a day cannot be cancelled for a group, or undefined when it can: the
// back refuses a day the group does not meet (400) and a day already cancelled.
export function cancelProblem(
  group: { weekdays: number[]; cancellations: string[] },
  date: string,
): 'notMeeting' | 'cancelled' | undefined {
  if (!group.weekdays.includes(isoWeekday(date))) return 'notMeeting'
  if (group.cancellations.includes(date)) return 'cancelled'
  return undefined
}
