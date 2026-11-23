// Where the client is in the booking: the step lives in the address, so Back
// goes one step back and a reload keeps the place. `staff` is a master's id or
// 'any'; later steps add the day and the time.
export type BookingSearch = { staff?: string }

export const ANY_MASTER = 'any'

export const bookingSearchOf = (
  search: Record<string, unknown>,
): BookingSearch => ({
  staff:
    typeof search.staff === 'string' && search.staff ? search.staff : undefined,
})
