import type { QueryClient } from '@tanstack/react-query'
import { redirect } from '@tanstack/react-router'

import { getMeControllerMeQueryOptions } from '@/api/account/account'
import { ApiError } from '@/apiFetch'
import { retryServerErrors } from '@/app/queryClient'

// GET /me: the signed-in account and its businesses. The cookie is HttpOnly, so
// this answer is the only way the app learns whether there is a session.
// The route checks retry a server error once, not 3 times with backoff: each
// retry is seconds of a pending page when the back is down; a 401 never. A
// cached answer younger than 30 s is trusted; an older one is asked again, so
// a session ended elsewhere is noticed.
export const sessionCheckOptions = () => ({
  ...getMeControllerMeQueryOptions(),
  retry: retryServerErrors(1),
  staleTime: 30_000,
})

export const meQueryKey = () => getMeControllerMeQueryOptions().queryKey

export const isNoSession = (error: unknown) =>
  error instanceof ApiError && error.status === 401

// beforeLoad of the cabinet: a guest goes to sign in; any other failure is the
// route's error to show.
export async function requireAccount(queryClient: QueryClient) {
  try {
    return await queryClient.fetchQuery(sessionCheckOptions())
  } catch (error) {
    if (isNoSession(error)) throw redirect({ to: '/sign-in', replace: true })
    throw error
  }
}

// beforeLoad of sign in / sign up: someone already signed in goes to the cabinet,
// or to the invitation they came from. If the check itself fails, the form is
// still the right page to show.
export async function redirectIfSignedIn(
  queryClient: QueryClient,
  invitation?: string,
) {
  const signedIn = await queryClient
    .fetchQuery(sessionCheckOptions())
    .then(() => true)
    .catch(() => false)
  if (!signedIn) return
  throw invitation
    ? redirect({
        to: '/invite/$token',
        params: { token: invitation },
        replace: true,
      })
    : redirect({ to: '/', replace: true })
}
