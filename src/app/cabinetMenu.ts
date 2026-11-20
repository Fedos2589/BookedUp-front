import { create } from 'zustand'

import type { CabinetLink } from '@/business/cabinetLinks'

// The header sits above the router's Outlet, the cabinet's links depend on
// the account the cabinet route has loaded: the cabinet puts them here and
// takes them away when it unmounts. Sign-in, invite and the booking page
// never fill it, so the header shows no menu there.
export const useCabinetMenu = create<{
  links: CabinetLink[] | null
  set: (links: CabinetLink[] | null) => void
}>((set) => ({ links: null, set: (links) => set({ links }) }))
