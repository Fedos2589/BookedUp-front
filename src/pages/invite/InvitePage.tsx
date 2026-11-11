import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import type { TFunction } from 'i18next'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { ActionBar } from 'ted-ui/ActionBar'
import { Button } from 'ted-ui/Button'
import { Input } from 'ted-ui/Input'
import { Typography } from 'ted-ui/Typography'
import { z } from 'zod'

import { getMeControllerMeQueryOptions } from '@/api/account/account'
import { useSessionControllerSignOut } from '@/api/auth/auth'
import type { InvitationLinkControllerPreview200 } from '@/api/generated.schemas'
import {
  getInvitationLinkControllerPreviewQueryOptions,
  useInvitationLinkControllerAccept,
  useInvitationLinkControllerSignUp,
} from '@/api/invitations/invitations'
import { ApiError } from '@/apiFetch'
import { retryServerErrors } from '@/app/queryClient'
import { meQueryKey } from '@/auth/session'
import { fieldErrorText } from '@/forms/fieldError'
import { PasswordInput } from '@/forms/PasswordInput'
import { AuthLayout } from '@/pages/auth/AuthLayout'
import authStyles from '@/pages/auth/AuthLayout.module.scss'
import { PagePending } from '@/pages/PagePending'
import { fieldsFromBadRequest } from '@/pages/signUp/badRequest'
import { ACCOUNT_FIELDS, signUpSchema } from '@/pages/signUp/signUpSchema'
import { useUnsavedInput } from '@/pwa/unsavedInput'

type Preview = InvitationLinkControllerPreview200

// The back's sign-up rules for an account; the business is the invitation's.
const joinSchema = signUpSchema.pick({
  name: true,
  email: true,
  password: true,
})
type JoinForm = z.infer<typeof joinSchema>

const isGone = (error: unknown) =>
  error instanceof ApiError && error.status === 404

// Accepting and signing up fail the same few ways. A 409 is either "already in
// this team" or "the offered schedule is taken" — the back tells them apart
// only in English prose, so one text covers both.
function joinErrorText(t: TFunction, error: unknown) {
  if (isGone(error)) return t('invite.gone')
  if (error instanceof ApiError && error.status === 409)
    return t('invite.conflict')
  if (error instanceof ApiError && error.status === 429)
    return t('auth.tooManyAttempts')
  return t('auth.failed')
}

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
  const me = useQuery({
    ...getMeControllerMeQueryOptions(),
    retry: retryServerErrors(1),
  })

  if (preview.isPending || me.isPending) return <PagePending />
  if (preview.isError)
    return isGone(preview.error) ? (
      <AuthLayout title={t('invite.goneTitle')}>
        <Typography variant="t3">{t('invite.goneText')}</Typography>
      </AuthLayout>
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
        <Accept token={token} email={me.data.user.email} />
      ) : (
        <SignUp token={token} />
      )}
    </AuthLayout>
  )
}

function inviteText(t: TFunction, { invitedBy, role }: Preview) {
  const asRole = t(`invite.asRole.${role}`)
  return invitedBy
    ? t('invite.byInviter', { inviter: invitedBy, role: asRole })
    : t('invite.anonymous', { role: asRole })
}

// After joining, the cabinet asks GET /me again and finds the new business.
function useOpenCabinet() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  return async () => {
    await queryClient.invalidateQueries({ queryKey: meQueryKey() })
    await navigate({ to: '/' })
  }
}

function Accept({ token, email }: { token: string; email: string }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const openCabinet = useOpenCabinet()
  const accept = useInvitationLinkControllerAccept({
    mutation: { onSuccess: openCabinet },
  })
  const signOut = useSessionControllerSignOut({
    mutation: {
      // Everything cached belonged to the account that left; the page asks
      // again and shows the guest's form.
      onSuccess: () => queryClient.resetQueries(),
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

function SignUp({ token }: { token: string }) {
  const { t } = useTranslation()
  const openCabinet = useOpenCabinet()
  const form = useForm<JoinForm>({
    resolver: zodResolver(joinSchema),
    defaultValues: { name: '', email: '', password: '' },
  })
  const { errors } = form.formState
  // Typed input holds back a new app version's reload (src/pwa).
  useUnsavedInput(form.formState.isDirty)

  const signUp = useInvitationLinkControllerSignUp({
    mutation: {
      // As in sign up: the cookie is set unless signing in failed after the
      // account was made; the cabinet's GET /me tells which.
      onSuccess: openCabinet,
      onError: (error) => {
        for (const field of fieldsOf(error))
          form.setError(
            field,
            {
              message:
                error.status === 409
                  ? 'validation.emailTaken'
                  : 'validation.invalid',
            },
            { shouldFocus: true },
          )
      },
    },
  })
  // A form-level message only for failures no field explains.
  const unexplained = signUp.isError && fieldsOf(signUp.error).length === 0

  return (
    <>
      <form
        className={authStyles.form}
        noValidate
        onSubmit={form.handleSubmit((data) => signUp.mutate({ token, data }))}
      >
        <Input
          label={t('auth.name')}
          autoComplete="name"
          fullWidth
          error={!!errors.name}
          errorText={fieldErrorText(t, errors.name)}
          {...form.register('name')}
        />
        <Input
          label={t('auth.email')}
          type="email"
          autoComplete="email"
          fullWidth
          error={!!errors.email}
          errorText={fieldErrorText(t, errors.email)}
          {...form.register('email')}
        />
        <PasswordInput
          label={t('auth.password')}
          autoComplete="new-password"
          fullWidth
          error={!!errors.password}
          errorText={fieldErrorText(t, errors.password)}
          {...form.register('password')}
        />
        {unexplained && (
          <Typography variant="t4" color="red-300" role="alert">
            {joinErrorText(t, signUp.error)}
          </Typography>
        )}
        <ActionBar className={authStyles.actions}>
          <Button
            type="submit"
            variant="solid"
            colorScheme="black"
            fullWidth
            loading={signUp.isPending}
          >
            {t('invite.signUp')}
          </Button>
        </ActionBar>
      </form>
      <Typography variant="t4">
        {t('auth.signUp.hasAccount')}{' '}
        <Link
          to="/sign-in"
          search={{ invitation: token }}
          className={authStyles.link}
        >
          {t('auth.signUp.toSignIn')}
        </Link>
      </Typography>
    </>
  )
}

// The fields a 409 (the email is registered) or a 400 (invalid fields) names.
function fieldsOf(error: unknown): (keyof JoinForm)[] {
  if (!(error instanceof ApiError)) return []
  const body = error.body as { field?: unknown; message?: unknown } | undefined
  if (error.status === 409) return body?.field === 'email' ? ['email'] : []
  if (error.status === 400 && Array.isArray(body?.message))
    return fieldsFromBadRequest(body.message.map(String)).filter(
      (field): field is keyof JoinForm =>
        (ACCOUNT_FIELDS as readonly string[]).includes(field),
    )
  return []
}
