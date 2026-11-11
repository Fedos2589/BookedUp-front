import { hashKey, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ActionBar } from 'ted-ui/ActionBar'
import { Button } from 'ted-ui/Button'
import { Typography } from 'ted-ui/Typography'

import { useSessionControllerSignOut } from '@/api/auth/auth'
import {
  getInvitationLinkControllerPreviewQueryKey,
  useInvitationLinkControllerAccept,
} from '@/api/invitations/invitations'
import { isNoSession, meQueryKey } from '@/auth/session'
import authStyles from '@/pages/auth/AuthLayout.module.scss'
import { joinErrorText } from './joinErrors'
import { useOpenCabinet } from './useOpenCabinet'

// Signed in: join with one button, or sign out to join as someone else.
export function AcceptInvitation({
  token,
  email,
}: {
  token: string
  email: string
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const openCabinet = useOpenCabinet()
  const accept = useInvitationLinkControllerAccept({
    mutation: {
      onSuccess: openCabinet,
      // The session ended while the page was open: forget the account, so the
      // page asks again and shows the guest's form. Reset, not refetch — a
      // 401 with an account still cached sends the app to sign in, and the
      // invitation would be lost.
      onError: (error) => {
        if (isNoSession(error))
          void queryClient.resetQueries({ queryKey: meQueryKey() })
      },
    },
  })
  const previewHash = hashKey(getInvitationLinkControllerPreviewQueryKey(token))
  const signOut = useSessionControllerSignOut({
    mutation: {
      // Everything cached belonged to the account that left, except the
      // invitation itself: it is nobody's. The page asks GET /me again and
      // shows the guest's form, without loading the invitation anew.
      onSuccess: () =>
        queryClient.resetQueries({
          predicate: (query) => query.queryHash !== previewHash,
        }),
    },
  })

  return (
    <>
      <Typography variant="t4" color="grey-400">
        {t('invite.signedInAs', { email })}
      </Typography>
      {accept.isError && (
        <Typography variant="t4" color="red-300" role="alert">
          {joinErrorText(t, accept.error)}
        </Typography>
      )}
      <ActionBar className={authStyles.actions}>
        <Button
          variant="solid"
          colorScheme="black"
          fullWidth
          loading={accept.isPending}
          onClick={() => accept.mutate({ token })}
        >
          {t('invite.accept')}
        </Button>
        <Button
          variant="ghost"
          colorScheme="grey"
          fullWidth
          loading={signOut.isPending}
          onClick={() => signOut.mutate()}
        >
          {t('cabinet.signOut')}
        </Button>
      </ActionBar>
    </>
  )
}
