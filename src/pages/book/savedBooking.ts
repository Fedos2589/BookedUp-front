import { z } from 'zod'

// The client's latest booking at a business, kept in the browser so a return
// visit can offer "Your booking". A convenience only: storage may be blocked or
// empty, and then there is simply nothing to offer.
const savedSchema = z.object({ manageLink: z.string(), startsAt: z.string() })

export type SavedBooking = z.infer<typeof savedSchema>

const keyOf = (slug: string) => `booking:${slug}`

export function saveBooking(slug: string, booking: SavedBooking) {
  try {
    localStorage.setItem(keyOf(slug), JSON.stringify(booking))
  } catch {
    // Blocked storage: the link on the done screen is still there.
  }
}

export function forgetSavedBooking(slug: string) {
  try {
    localStorage.removeItem(keyOf(slug))
  } catch {
    // Nothing to forget.
  }
}

// The saved booking while it is still to come, else null.
export function savedBookingOf(slug: string, now: Date): SavedBooking | null {
  try {
    const raw = localStorage.getItem(keyOf(slug))
    if (!raw) return null
    const saved = savedSchema.safeParse(JSON.parse(raw))
    if (!saved.success) return null
    return new Date(saved.data.startsAt) > now ? saved.data : null
  } catch {
    return null
  }
}
