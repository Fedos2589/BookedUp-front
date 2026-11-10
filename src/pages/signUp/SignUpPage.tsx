import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import type { TFunction } from 'i18next'
import {
  type FormEvent,
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Combobox } from 'ted-ui/Combobox'
import { Input } from 'ted-ui/Input'
import { Typography } from 'ted-ui/Typography'

import { useSignUpControllerSignUp } from '../../api/auth/auth'
import { ApiError } from '../../apiFetch'
import { fieldErrorText } from '../../forms/fieldError'
import { AuthLayout } from '../auth/AuthLayout'
import authStyles from '../auth/AuthLayout.module.scss'
import { fieldsFromBadRequest, type SignUpField } from './badRequest'
import {
  ACCOUNT_FIELDS,
  type SignUpFormInput,
  type SignUpFormValues,
  signUpSchema,
} from './signUpSchema'
import { slugFromName } from './slug'
import {
  browserTimeZone,
  supportedTimeZones,
  timeZoneOptions,
} from './timeZones'

type Step = 'account' | 'business'

const isAccountField = (field: SignUpField) =>
  (ACCOUNT_FIELDS as readonly string[]).includes(field)

function signUpErrorText(t: TFunction, error: unknown) {
  if (error instanceof ApiError && error.status === 429)
    return t('auth.tooManyAttempts')
  return t('auth.failed')
}

// Two steps, one request: POST /auth/sign-up takes the owner and the business
// together, so nothing is created until the second step is submitted.
export function SignUpPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('account')
  // The address follows the business name until the owner types one.
  const [slugEdited, setSlugEdited] = useState(false)
  const zones = useMemo(
    () => timeZoneOptions(supportedTimeZones(), browserTimeZone()),
    [],
  )
  const form = useForm<SignUpFormInput, unknown, SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      businessName: '',
      slug: '',
      timeZone: browserTimeZone(),
    },
  })
  const { errors } = form.formState
  const headingRef = useRef<HTMLHeadingElement>(null)

  // A step change moves focus to the new step's first invalid field (a 409 on
  // the email sends the owner back to it) or else to its heading — it never
  // drops to <body>. Not on the first render: no step has changed yet.
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    const invalid =
      step === 'account'
        ? ACCOUNT_FIELDS.find((name) => form.getFieldState(name).error)
        : undefined
    if (invalid) form.setFocus(invalid)
    else headingRef.current?.focus()
  }, [step, form])

  const signUp = useSignUpControllerSignUp({
    mutation: {
      // The cookie is set unless the back's sign-in failed after creating the
      // account; the cabinet's own GET /me tells which (401 → sign in). It does
      // ask again: this page is only reachable when GET /me failed, and a failed
      // query with no data is fetched anew.
      onSuccess: () => navigate({ to: '/' }),
      onError: (error) => {
        const fields = conflictOrInvalidFields(error)
        if (fields.length === 0) return
        for (const field of fields) {
          form.setError(
            field,
            {
              message:
                error.status === 409
                  ? field === 'email'
                    ? 'validation.emailTaken'
                    : 'validation.slugTaken'
                  : 'validation.invalid',
            },
            // A field on this step is mounted and takes focus now; one on the
            // first step gets it from the step change above.
            { shouldFocus: true },
          )
        }
        if (fields.some(isAccountField)) setStep('account')
      },
    },
  })

  // Step 1 submits like any form (Enter, the keyboard's "Go") but checks only
  // its own fields and moves on.
  const next = async (event: FormEvent) => {
    event.preventDefault()
    if (await form.trigger(ACCOUNT_FIELDS, { shouldFocus: true }))
      setStep('business')
  }

  const submit = form.handleSubmit((values) =>
    signUp.mutate({
      data: {
        name: values.name,
        email: values.email,
        password: values.password,
        business: {
          name: values.businessName,
          slug: values.slug,
          timeZone: values.timeZone,
        },
      },
    }),
  )

  const slug = useWatch({ control: form.control, name: 'slug' })
  // A form-level message only for failures no field explains.
  const unexplained =
    signUp.isError && conflictOrInvalidFields(signUp.error).length === 0

  return (
    <AuthLayout
      headingRef={headingRef}
      title={
        step === 'account'
          ? t('auth.signUp.accountTitle')
          : t('auth.signUp.businessTitle')
      }
    >
      <Typography variant="t5" color="grey-400">
        {t('auth.signUp.step', { step: step === 'account' ? 1 : 2 })}
      </Typography>
      <form
        className={authStyles.form}
        noValidate
        onSubmit={step === 'account' ? (event) => void next(event) : submit}
      >
        {/* Keyed: without it React reuses step 1's inputs for step 2 at the same
            positions, and going back shows step 2's values in them. */}
        {step === 'account' ? (
          <Fragment key="account">
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
            <Input
              label={t('auth.password')}
              type="password"
              autoComplete="new-password"
              fullWidth
              error={!!errors.password}
              errorText={fieldErrorText(t, errors.password)}
              {...form.register('password')}
            />
            <Button type="submit" variant="solid" colorScheme="black" fullWidth>
              {t('auth.signUp.continue')}
            </Button>
          </Fragment>
        ) : (
          <Fragment key="business">
            <Input
              label={t('auth.signUp.businessName')}
              autoComplete="organization"
              fullWidth
              error={!!errors.businessName}
              errorText={fieldErrorText(t, errors.businessName)}
              {...form.register('businessName', {
                onChange: (event: { target: { value: string } }) => {
                  if (!slugEdited)
                    form.setValue('slug', slugFromName(event.target.value), {
                      // After a submit, check it again: a 409 "taken" must
                      // not outlive the address it was about.
                      shouldValidate: form.formState.isSubmitted,
                    })
                },
              })}
            />
            <Input
              label={t('auth.signUp.slug')}
              autoCapitalize="none"
              spellCheck={false}
              fullWidth
              error={!!errors.slug}
              errorText={fieldErrorText(t, errors.slug)}
              helperText={t('auth.signUp.slugHelper', {
                url: `${window.location.host}/book/${slug || '…'}`,
              })}
              {...form.register('slug', {
                // Cleared by hand: follow the name again.
                onChange: (event: { target: { value: string } }) =>
                  setSlugEdited(event.target.value !== ''),
              })}
            />
            <Controller
              control={form.control}
              name="timeZone"
              render={({ field, fieldState }) => (
                <Combobox
                  label={t('auth.signUp.timeZone')}
                  options={zones}
                  value={field.value || null}
                  onValueChange={(zone) => field.onChange(zone ?? '')}
                  error={!!fieldState.error}
                  errorText={fieldErrorText(t, fieldState.error)}
                  helperText={t('auth.signUp.timeZoneHelper')}
                  openOnFocus
                />
              )}
            />
            {unexplained && (
              <Typography variant="t5" color="red-300" role="alert">
                {signUpErrorText(t, signUp.error)}
              </Typography>
            )}
            <Button
              type="submit"
              variant="solid"
              colorScheme="black"
              fullWidth
              loading={signUp.isPending}
            >
              {t('auth.signUp.submit')}
            </Button>
            <Button
              type="button"
              variant="ghost"
              colorScheme="grey"
              fullWidth
              onClick={() => setStep('account')}
            >
              {t('auth.signUp.back')}
            </Button>
          </Fragment>
        )}
      </form>
      <Typography variant="t5">
        {t('auth.signUp.hasAccount')}{' '}
        <Link to="/sign-in" className={authStyles.link}>
          {t('auth.signUp.toSignIn')}
        </Link>
      </Typography>
    </AuthLayout>
  )
}

// The fields a 409 (taken email or slug) or a 400 (invalid fields) points at.
function conflictOrInvalidFields(error: unknown): SignUpField[] {
  if (!(error instanceof ApiError)) return []
  const body = error.body as { field?: unknown; message?: unknown } | undefined
  if (error.status === 409)
    return body?.field === 'email' || body?.field === 'slug' ? [body.field] : []
  if (error.status === 400 && Array.isArray(body?.message))
    return fieldsFromBadRequest(body.message.map(String))
  return []
}
