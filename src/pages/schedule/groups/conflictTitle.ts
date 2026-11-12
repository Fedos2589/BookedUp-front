import { ApiError } from '@/apiFetch'

// The title of what a 409 says the session collides with, if it says.
export function conflictTitle(error: unknown) {
  if (!(error instanceof ApiError) || error.status !== 409) return undefined
  return (error.body as { conflictsWith?: { title?: string } } | undefined)
    ?.conflictsWith?.title
}
