import {
  usePublicBookingControllerBusiness,
  usePublicBookingControllerSlots,
} from '@/api'
import { addDays, dateIn } from '@/dates'
import { useNow } from '@/useNow'

// How many days ahead the booking page looks, today included.
const DAYS_AHEAD = 14

// The business and the free times of all its masters for the next two weeks;
// steps 1 and 2 share the one slots request. "Today" is on the business's
// clock; the slots wait for the business to say what it is.
export function useBookingData(slug: string) {
  const business = usePublicBookingControllerBusiness(slug)
  const now = useNow()
  const today = business.data
    ? (dateIn(now, business.data.timeZone) ?? now.toISOString().slice(0, 10))
    : ''
  const slots = usePublicBookingControllerSlots(
    slug,
    { from: today, to: addDays(today, DAYS_AHEAD - 1) },
    { query: { enabled: Boolean(business.data) } },
  )
  return { business, slots }
}
