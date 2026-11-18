import { ApiError } from '@/apiFetch'

// How many live bookings a refused schedule change (409 `hasBookings`) is
// about; undefined for any other failure.
export function bookingsInTheWay(error: unknown) {
  if (!(error instanceof ApiError) || error.status !== 409) return undefined
  const body = error.body as
    { code?: string; appointmentIds?: string[] } | undefined
  return body?.code === 'hasBookings' ? body.appointmentIds?.length : undefined
}
