// Where the client is in the booking: the step lives in the address, so Back
// goes one step back and a reload keeps the place. `staff` is a master's id or
// 'any'; `day` is a calendar day on the business's clock; `slot` is the chosen
// time's key (see slotsForPicker).
export type BookingSearch = {
  staff?: string
  day?: string
  slot?: string
  // Step 3, the client's details, for the chosen time.
  contacts?: true
}

export const ANY_MASTER = 'any'

const textOf = (value: unknown) =>
  typeof value === 'string' && value ? value : undefined

export const bookingSearchOf = (
  search: Record<string, unknown>,
): BookingSearch => ({
  staff: textOf(search.staff),
  day: textOf(search.day),
  slot: textOf(search.slot),
  contacts: search.contacts === true ? true : undefined,
})
