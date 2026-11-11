import { createContext, useContext } from 'react'

import type {
  MeControllerMe200,
  MeControllerMe200BusinessesItem,
} from '@/api/generated.schemas'

type Account = MeControllerMe200
export type Business = MeControllerMe200BusinessesItem

// The business the cabinet works on: the account's first one for now, which is
// the oldest membership (the back orders /me by joining, so it stays the same
// across reloads). Choosing among several changes only this function.
// None is a real state since E3: the account's last membership was removed.
export function currentBusinessOf(account: Account): Business | undefined {
  return account.businesses[0]
}

// CabinetLayout provides it and renders its pages only when there is a
// business, so a cabinet page always has one.
export const CurrentBusiness = createContext<Business | undefined>(undefined)

export function useCurrentBusiness(): Business {
  const business = useContext(CurrentBusiness)
  if (!business) throw new Error('useCurrentBusiness outside CabinetLayout')
  return business
}
