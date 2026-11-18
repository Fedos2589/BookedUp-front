import type { CountryCode } from 'libphonenumber-js'

import { clientPhone } from './newBooking'

type Person = { id: string; name: string; phone: string | null }

// What the booking takes for its client: someone in the base, or a new person
// (the body of `POST /clients`, without the note — that stays on the booking).
export type PickerValue =
  | { clientId: string }
  | { newClient: { name: string; phone: string } }
  | { newClient: { name: string; guardianId: string } }

export type PickerInput = {
  mode: 'search' | 'new'
  // The person chosen in the search.
  picked: { id: string; name: string } | null
  name: string
  country: CountryCode
  phone: string
  // The people behind the typed phone, holder first; undefined while the
  // lookup runs (or the phone is not whole yet).
  account: Person[] | undefined
  // The radio over the account: a person's id, or 'new'.
  choice: string | 'new' | undefined
}

const NAME_MAX = 100

// The value the current inputs make; undefined while they are incomplete.
export function pickerValue(input: PickerInput): PickerValue | undefined {
  if (input.mode === 'search')
    return input.picked ? { clientId: input.picked.id } : undefined

  const phone = clientPhone(input.country, input.phone)
  const { account } = input
  if (!phone || !account) return undefined
  const name = input.name.trim()
  const named = name.length > 0 && name.length <= NAME_MAX
  if (account.length === 0)
    return named ? { newClient: { name, phone } } : undefined

  if (input.choice === 'new')
    return named
      ? { newClient: { name, guardianId: account[0].id } }
      : undefined
  const person = account.find((p) => p.id === input.choice)
  return person ? { clientId: person.id } : undefined
}
