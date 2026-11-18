import type { CountryCode } from 'libphonenumber-js'

import { useClientsControllerList } from '@/api/clients/clients'
import { useCurrentBusiness } from '@/business/currentBusiness'
import { clientPhone } from './newBooking'

// The people on a typed phone (the holder, then their dependents): empty for a
// number nobody has, undefined while the phone is not whole or the answer is
// on its way.
export function useAccountOf(country: CountryCode, nationalNumber: string) {
  const business = useCurrentBusiness()
  const phone = clientPhone(country, nationalNumber)
  const found = useClientsControllerList(
    business.id,
    { phone },
    { query: { enabled: !!phone } },
  )
  return phone ? found.data?.items : undefined
}
