import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { ActionBar } from 'ted-ui/ActionBar'
import { Button } from 'ted-ui/Button'
import { Input } from 'ted-ui/Input'
import { Typography } from 'ted-ui/Typography'

import { useInvitationLinkControllerSignUp } from '@/api/invitations/invitations'
import { fieldErrorText } from '@/forms/fieldError'
import { PasswordInput } from '@/forms/PasswordInput'
import authStyles from '@/pages/auth/AuthLayout.module.scss'
import { useUnsavedInput } from '@/pwa/unsavedInput'
import { joinErrorText } from './joinErrors'
import { type JoinForm, joinFieldsOf, joinSchema } from './joinForm'
import { useOpenCabinet } from './useOpenCabinet'

// A guest: makes an account and joins in one request. A registered email is
// sent to sign in, which comes back here.
export function SignUpToJoin({ token }: { token: string }) {
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
        for (const field of joinFieldsOf(error))
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
  const unexplained = signUp.isError && joinFieldsOf(signUp.error).length === 0

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
