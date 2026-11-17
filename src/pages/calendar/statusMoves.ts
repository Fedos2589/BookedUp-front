import type { AppointmentsControllerChangeStatusBodyStatus as Status } from '@/api/generated.schemas'

// The statuses a booking can move to, as the back allows it: `DONE` and
// `NO_SHOW` only once it has started, a cancel at any time; nothing from a
// status that is final.
export function statusMoves(
  status: Status,
  started: boolean,
): Exclude<Status, 'BOOKED'>[] {
  if (status !== 'BOOKED' && status !== 'CONFIRMED') return []
  return [
    ...(status === 'BOOKED' ? (['CONFIRMED'] as const) : []),
    ...(started ? (['DONE', 'NO_SHOW'] as const) : []),
    'CANCELLED',
  ]
}
