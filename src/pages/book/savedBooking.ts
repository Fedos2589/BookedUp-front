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

const readSaved = (slug: string): SavedBooking | null => {
  try {
    const raw = localStorage.getItem(keyOf(slug))
    if (!raw) return null
    const saved = savedSchema.safeParse(JSON.parse(raw))
    return saved.success ? saved.data : null
  } catch {
    return null
  }
}

// The manage page changed the booking behind `token`: the remembered one
// follows it (a new time, or none after a cancel), but only when it is that
// very booking — the client may hold others. The link ends in /manage/<token>.
export function updateSavedBooking(
  slug: string,
  token: string,
  startsAt: string | null,
) {
  const saved = readSaved(slug)
  if (!saved?.manageLink.endsWith(`/manage/${token}`)) return
  if (startsAt === null) {
    try {
      localStorage.removeItem(keyOf(slug))
    } catch {
      // Nothing to forget.
    }
  } else saveBooking(slug, { ...saved, startsAt })
}

// The saved booking while it is still to come, else null.
export function savedBookingOf(slug: string, now: Date): SavedBooking | null {
  const saved = readSaved(slug)
  return saved && new Date(saved.startsAt) > now ? saved : null
}
