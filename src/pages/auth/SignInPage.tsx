import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import type { TFunction } from 'i18next'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { ActionBar } from 'ted-ui/ActionBar'
import { Button } from 'ted-ui/Button'
import { Input } from 'ted-ui/Input'
import { Typography } from 'ted-ui/Typography'
import { z } from 'zod'

import { useSessionControllerSignIn } from '@/api/auth/auth'
import { ApiError } from '@/apiFetch'
import { meQueryKey } from '@/auth/session'
import { fieldErrorText } from '@/forms/fieldError'
import { PasswordInput } from '@/forms/PasswordInput'
import { useUnsavedInput } from '@/pwa/unsavedInput'
import { AuthLayout } from './AuthLayout'
import authStyles from './AuthLayout.module.scss'

const signInSchema = z.object({
  email: z.string().trim().pipe(z.email('validation.email')),
  // No minimum: the back still accepts passwords set under an older rule.
  password: z.string().min(1, 'validation.required'),
})

type SignInForm = z.infer<typeof signInSchema>

function signInErrorText(t: TFunction, error: unknown) {
  if (error instanceof ApiError && error.status === 401)
    return t('auth.signIn.invalidCredentials')
  if (error instanceof ApiError && error.status === 429)
    return t('auth.tooManyAttempts')
  return t('auth.failed')
}

export function SignInPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const form = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  })
  const signIn = useSessionControllerSignIn({
    mutation: {
      // The answer is what GET /me would give: cache it, the cabinet needs no refetch.
      onSuccess: async (account) => {
        queryClient.setQueryData(meQueryKey(), account)
        await navigate({ to: '/' })
      },
    },
  })
  const { errors } = form.formState
  // Typed input holds back a new app version's reload (src/pwa).
  useUnsavedInput(form.formState.isDirty)

  return (
    <AuthLayout title={t('auth.signIn.title')}>
      <form
        className={authStyles.form}
        noValidate
        onSubmit={form.handleSubmit((data) => signIn.mutate({ data }))}
      >
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
          autoComplete="current-password"
          fullWidth
          error={!!errors.password}
          errorText={fieldErrorText(t, errors.password)}
          {...form.register('password')}
        />
        {signIn.isError && (
          <Typography variant="t4" color="red-300" role="alert">
            {signInErrorText(t, signIn.error)}
          </Typography>
        )}
        <ActionBar className={authStyles.actions}>
          <Button
            type="submit"
            variant="solid"
            colorScheme="black"
            fullWidth
            loading={signIn.isPending}
          >
            {t('auth.signIn.submit')}
          </Button>
        </ActionBar>
      </form>
      <Typography variant="t4">
        {t('auth.signIn.noAccount')}{' '}
        <Link to="/sign-up" className={authStyles.link}>
          {t('auth.signIn.toSignUp')}
        </Link>
      </Typography>
    </AuthLayout>
  )
}
