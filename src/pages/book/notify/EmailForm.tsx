import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Input } from 'ted-ui/Input'

import { usePublicBookingControllerEmailOn } from '@/api/public-booking/public-booking'
import { ApiError } from '@/apiFetch'
import { fieldErrorText } from '@/forms/fieldError'
import { useUnsavedInput } from '@/pwa/unsavedInput'
import { type EmailForm as Values, emailSchema } from './emailAddress'
import type { Language } from '@/language'
import styles from './NotifyMe.module.scss'
import type { RowMutation } from './rowMutation'

type Props = {
  token: string
  locale: Language
  mutation: RowMutation
  onSaved: () => void
}

// The address to send reminders to. A 400 is the back's own check of it.
export function EmailForm({ token, locale, mutation, onSaved }: Props) {
  const { t } = useTranslation()
  const form = useForm<Values>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  })
  const { errors } = form.formState
  useUnsavedInput(form.formState.isDirty)

  const emailOn = usePublicBookingControllerEmailOn({
    mutation: {
      ...mutation,
      onSuccess: onSaved,
      onError: (error) => {
        if (error instanceof ApiError && error.status === 400)
          form.setError(
            'email',
            { message: 'validation.email' },
            { shouldFocus: true },
          )
        else mutation.onError(error)
      },
    },
  })

  return (
    <form
      className={styles.emailForm}
      noValidate
      onSubmit={form.handleSubmit((data) =>
        emailOn.mutate({ token, data: { ...data, locale } }),
      )}
    >
      <Input
        label={t('notify.email')}
        type="email"
        autoComplete="email"
        fullWidth
        error={!!errors.email}
        errorText={fieldErrorText(t, errors.email)}
        {...form.register('email')}
      />
      <Button
        type="submit"
        variant="solid"
        colorScheme="black"
        loading={emailOn.isPending}
      >
        {t('notify.save')}
      </Button>
    </form>
  )
}
