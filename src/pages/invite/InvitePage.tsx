import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Typography } from 'ted-ui/Typography'

import { getInvitationLinkControllerPreviewQueryOptions } from '@/api/invitations/invitations'
import { retryServerErrors } from '@/app/queryClient'
import { sessionCheckOptions } from '@/auth/session'
import { AuthLayout } from '@/pages/auth/AuthLayout'
import { PagePending } from '@/pages/PagePending'
import { AcceptInvitation } from './AcceptInvitation'
import { InvitationGone } from './InvitationGone'
import { inviteText } from './inviteText'
import { isGone } from './joinErrors'
import { SignUpToJoin } from './SignUpToJoin'

// What a link from «Invite» on the Team page opens. Public: the person may have
// no account yet. A guest signs up here; someone signed in joins with a button.
export function InvitePage({ token }: { token: string }) {
  const { t } = useTranslation()
  const preview = useQuery({
    ...getInvitationLinkControllerPreviewQueryOptions(token),
    retry: retryServerErrors(1),
  })
  // Any failure to learn the session reads as a guest: the form is still the
  // right thing to show, and a registered email is told to sign in.
  // The same check as the routes': an answer sign in has just cached is trusted.
  const me = useQuery(sessionCheckOptions())

  if (preview.isPending || me.isPending) return <PagePending />
  if (preview.isError)
    return isGone(preview.error) ? (
      <InvitationGone />
    ) : (
      <AuthLayout title={t('invite.loadFailed')}>
        <Button
          variant="solid"
          colorScheme="black"
          onClick={() => void preview.refetch()}
        >
          {t('common.tryAgain')}
        </Button>
      </AuthLayout>
    )

  return (
    <AuthLayout
      title={t('invite.title', { business: preview.data.businessName })}
    >
      <Typography variant="t3">{inviteText(t, preview.data)}</Typography>
      {me.data ? (
        <AcceptInvitation token={token} email={me.data.user.email} />
      ) : (
        <SignUpToJoin token={token} />
      )}
    </AuthLayout>
  )
}
