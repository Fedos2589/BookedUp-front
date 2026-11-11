import { zodResolver } from '@hookform/resolvers/zod'
import { hashKey, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import type { TFunction } from 'i18next'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { ActionBar } from 'ted-ui/ActionBar'
import { Button } from 'ted-ui/Button'
import { Input } from 'ted-ui/Input'
import { Typography } from 'ted-ui/Typography'
import { z } from 'zod'

import { useSessionControllerSignOut } from '@/api/auth/auth'
import type { InvitationLinkControllerPreview200 } from '@/api/generated.schemas'
import {
  getInvitationLinkControllerPreviewQueryKey,
  getInvitationLinkControllerPreviewQueryOptions,
  useInvitationLinkControllerAccept,
  useInvitationLinkControllerSignUp,
} from '@/api/invitations/invitations'
import { ApiError } from '@/apiFetch'
import { retryServerErrors } from '@/app/queryClient'
import { isNoSession, meQueryKey, sessionCheckOptions } from '@/auth/session'
import { fieldErrorText } from '@/forms/fieldError'
import { PasswordInput } from '@/forms/PasswordInput'
import { AuthLayout } from '@/pages/auth/AuthLayout'
import authStyles from '@/pages/auth/AuthLayout.module.scss'
import { PagePending } from '@/pages/PagePending'
import { fieldsOfSignUpError } from '@/pages/signUp/badRequest'
import { signUpSchema } from '@/pages/signUp/signUpSchema'
import { useUnsavedInput } from '@/pwa/unsavedInput'

type Preview = InvitationLinkControllerPreview200

// The back's sign-up rules for an account; the business is the invitation's.
const joinSchema = signUpSchema.pick({
  name: true,
  email: true,
  password: true,
})
type JoinForm = z.infer<typeof joinSchema>

// 404: used, revoked, expired or never issued. 400: not even shaped like a
// token (cut short or glued to text by a messenger) — retrying never helps.
const isGone = (error: unknown) =>
  error instanceof ApiError && (error.status === 404 || error.status === 400)

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
// No token: the route found none of the back's shape in the address — the
// generated client puts it into the API path as is, so such a one is never sent.
export function InvitePage({ token }: { token: string | undefined }) {
  return token ? <Invitation token={token} /> : <InvitationGone />
}

function InvitationGone() {
  const { t } = useTranslation()
  return (
    <AuthLayout title={t('invite.goneTitle')}>
      <Typography variant="t3">{t('invite.goneText')}</Typography>
    </AuthLayout>
  )
}

function Invitation({ token }: { token: string }) {
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

// The fields a 409 or a 400 names, of the three this form has.
const fieldsOf = (error: unknown) =>
  fieldsOfSignUpError(error).filter(
    (field): field is keyof JoinForm => field in joinSchema.shape,
  )
