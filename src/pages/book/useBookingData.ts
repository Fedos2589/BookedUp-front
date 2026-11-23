import { keepPreviousData } from '@tanstack/react-query'

import {
  usePublicBookingControllerBusiness,
  usePublicBookingControllerSlots,
} from '@/api/public-booking/public-booking'
import { addDays, dateIn } from '@/dates'
import { useNow } from '@/useNow'
import { DAYS_AHEAD } from './slotsForPicker'

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
    {
      query: {
        enabled: Boolean(business.data),
        // The window moves at midnight: the old times stay until the new come.
        placeholderData: keepPreviousData,
      },
    },
  )
  return { business, slots, today }
}
