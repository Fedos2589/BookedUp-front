import { type UseFormReturn, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Input } from 'ted-ui/Input'
import { PhoneNumberField } from 'ted-ui/PhoneNumberField/PhoneNumberField'

import { fieldErrorText } from '@/forms/fieldError'
import type { BookingForm } from './newBooking'

// The fields of `useClientForm`: name, phone, note.
export function ClientFields({ form }: { form: UseFormReturn<BookingForm> }) {
  const { t } = useTranslation()
  const country = useWatch({ control: form.control, name: 'country' })
  const phone = useWatch({ control: form.control, name: 'phone' })
  const errors = form.formState.errors

  return (
    <>
      <Input
        label={t('calendar.new.name')}
        fullWidth
        error={!!errors.clientName}
        errorText={fieldErrorText(t, errors.clientName)}
        {...form.register('clientName')}
      />
      <PhoneNumberField
        label={t('calendar.new.phone')}
        country={country}
        nationalNumber={phone}
        onCountryChange={(c) =>
          form.setValue('country', c, { shouldDirty: true })
        }
        onNationalNumberChange={(n) =>
          form.setValue('phone', n, { shouldDirty: true })
        }
        error={!!errors.phone}
        errorText={fieldErrorText(t, errors.phone)}
      />
      <Input
        label={t('calendar.new.note')}
        fullWidth
        error={!!errors.note}
        errorText={fieldErrorText(t, errors.note)}
        {...form.register('note')}
      />
    </>
  )
}
