import type { QueryClient } from '@tanstack/react-query'
import { redirect } from '@tanstack/react-router'

import { getMeControllerMeQueryOptions } from '../api/account/account'
import { ApiError } from '../apiFetch'

// GET /me: the signed-in account and its businesses. The cookie is HttpOnly, so
// this answer is the only way the app learns whether there is a session.
export const meQueryOptions = () => getMeControllerMeQueryOptions()

const isNoSession = (error: unknown) =>
  error instanceof ApiError && error.status === 401

// beforeLoad of the cabinet: a guest goes to sign in; any other failure is the
// route's error to show.
export async function requireAccount(queryClient: QueryClient) {
  try {
    return await queryClient.ensureQueryData(meQueryOptions())
  } catch (error) {
    if (isNoSession(error)) throw redirect({ to: '/sign-in', replace: true })
    throw error
  }
}

// beforeLoad of sign in / sign up: someone already signed in goes to the cabinet.
// If the check itself fails, the form is still the right page to show.
export async function redirectIfSignedIn(queryClient: QueryClient) {
  const signedIn = await queryClient
    .ensureQueryData(meQueryOptions())
    .then(() => true)
    .catch(() => false)
  if (signedIn) throw redirect({ to: '/', replace: true })
}
