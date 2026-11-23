import type { QueryClient } from '@tanstack/react-query'
import { redirect } from '@tanstack/react-router'

import {
  getMeControllerMeQueryOptions,
  meControllerMe,
} from '@/api/account/account'
import { ApiError } from '@/apiFetch'
import { retryServerErrors } from '@/app/queryClient'
import i18n from '@/i18n'
import { isLanguage } from '@/language'

// GET /me: the signed-in account and its businesses. The cookie is HttpOnly, so
// this answer is the only way the app learns whether there is a session.
// The route checks retry a server error once, not 3 times with backoff: each
// retry is seconds of a pending page when the back is down; a 401 never. A
// cached answer younger than 30 s is trusted; an older one is asked again, so
// a session ended elsewhere is noticed.
//
// The account's language comes with the answer: someone who signed in on a new
// device starts in the browser's language, and the account's wins. Only a fresh
// answer counts — a cached one may predate the choice just made in the dropdown.
export const sessionCheckOptions = () => {
  const options = getMeControllerMeQueryOptions()
  return {
    ...options,
    queryFn: async ({ signal }: { signal: AbortSignal }) => {
      const account = await meControllerMe({ signal })
      if (
        isLanguage(account.user.locale) &&
        account.user.locale !== i18n.language
      ) {
        await i18n.changeLanguage(account.user.locale)
      }
      return account
    },
    retry: retryServerErrors(1),
    staleTime: 30_000,
  }
}

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
