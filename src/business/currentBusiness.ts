import type { MeControllerMe200 } from '../api/generated.schemas'

type Account = MeControllerMe200

// The business the cabinet works on. One per owner for now (E2); choosing among
// several (E3 staff in more than one business) changes only this function.
export function currentBusinessOf(account: Account) {
  const business = account.businesses[0]
  // Sign-up creates the business with the account; none means broken data.
  if (!business) throw new Error('The account belongs to no business')
  return business
}
