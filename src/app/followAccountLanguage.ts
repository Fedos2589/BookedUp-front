import { hashKey, type QueryClient } from '@tanstack/react-query'

import { getLocaleControllerChooseMutationKey } from '@/api/account/account'
import { type Account, meQueryKey } from '@/auth/session'
import i18n from '@/i18n'
import { isLanguage } from '@/language'

// The interface speaks the language of the account: whenever GET /me gets a
// fresh answer — a refetch by any observer, or the sign-in answer put into the
// cache — it switches to it. A cached answer raises no event, so it cannot undo
// a choice just made. While PUT /locale is on its way, the answer may still be
// the old language: it waits.
export function followAccountLanguage(queryClient: QueryClient) {
  const meHash = hashKey(meQueryKey())
  return queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated' || event.action.type !== 'success') return
    if (event.query.queryHash !== meHash) return
    const choosing = queryClient.isMutating({
      mutationKey: getLocaleControllerChooseMutationKey(),
    })
    if (choosing > 0) return
    const { locale } = (event.query.state.data as Account).user
    if (isLanguage(locale) && locale !== i18n.language) {
      void i18n.changeLanguage(locale)
    }
  })
}
