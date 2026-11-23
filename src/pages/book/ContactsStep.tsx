import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { ActionBar } from 'ted-ui/ActionBar'
import { Button } from 'ted-ui/Button'
import { Input, Textarea } from 'ted-ui/Input'
import { PhoneNumberField } from 'ted-ui/PhoneNumberField/PhoneNumberField'
import { Typography } from 'ted-ui/Typography'

import { usePublicBookingControllerBook } from '@/api/public-booking/public-booking'
import type { PublicBookingControllerBook201 } from '@/api/generated.schemas'
import { dateTimeIn, timeIn } from '@/dates'
import { fieldErrorText } from '@/forms/fieldError'
import { useUnsavedInput } from '@/pwa/unsavedInput'
import { refusalOf } from './bookRefusal'
import styles from './BookingPage.module.scss'
import {
  bookBody,
  type ContactsForm,
  contactsDefaults,
  contactsSchema,
} from './contactsForm'
import { type PickerSlot, slotOfKey } from './slotsForPicker'
import { useStepHeading } from './useStepHeading'

type Props = {
  slug: string
  timeZone: string
  slot: PickerSlot
  // The master's name, or undefined for "any" (known after booking).
  master: string | undefined
  onBooked: (booked: PublicBookingControllerBook201) => void
  // The time is gone: the client picks another.
  onTaken: () => void
}

// Step 3: who is booking. The chosen time and master are shown above the form.
export function ContactsStep({
  slug,
  timeZone,
  slot,
  master,
  onBooked,
  onTaken,
}: Props) {
  const { t, i18n } = useTranslation()
  const heading = useStepHeading()
  const form = useForm<ContactsForm>({
    resolver: zodResolver(contactsSchema),
    defaultValues: contactsDefaults(i18n.language),
  })
  const country = useWatch({ control: form.control, name: 'country' })
  const phone = useWatch({ control: form.control, name: 'phone' })
  const errors = form.formState.errors
  useUnsavedInput(form.formState.isDirty)
  const book = usePublicBookingControllerBook()

  const { startsAt, endsAt } = slotOfKey(slot.id)
  const when = [
    dateTimeIn(new Date(startsAt), timeZone, i18n.language),
    timeIn(new Date(endsAt), timeZone),
  ].join('–')
  const who = master ?? slot.master ?? t('booking.anyMaster')

  const refusal = book.isError ? refusalOf(book.error) : undefined
  const markedFields = refusal?.kind === 'fields' ? refusal.fields : []

  const submit = (values: ContactsForm) =>
    book.mutate(
      { slug, data: bookBody(slot.id, values) },
      {
        onSuccess: onBooked,
        onError: (error) => {
          if (refusalOf(error).kind === 'taken') onTaken()
        },
      },
    )

  return (
    <form
      noValidate
      className={styles.form}
      onSubmit={form.handleSubmit(submit)}
    >
      <Typography variant="t2" component="h2" tabIndex={-1} ref={heading}>
        {t('booking.contactsTitle')}
      </Typography>
      <Typography variant="t2" color="grey-500">
        {[when, slot.title, who].filter(Boolean).join(' · ')}
      </Typography>
      <Input
        label={t('booking.name')}
        fullWidth
        autoComplete="name"
        error={!!errors.name || markedFields.includes('name')}
        errorText={
          fieldErrorText(t, errors.name) ??
          (markedFields.includes('name') ? t('validation.invalid') : undefined)
        }
        {...form.register('name')}
      />
      <PhoneNumberField
        label={t('booking.phone')}
        country={country}
        nationalNumber={phone}
        onCountryChange={(c) =>
          form.setValue('country', c, { shouldDirty: true })
        }
        onNationalNumberChange={(n) =>
          form.setValue('phone', n, { shouldDirty: true })
        }
        error={!!errors.phone || markedFields.includes('phone')}
        errorText={
          fieldErrorText(t, errors.phone) ??
          (markedFields.includes('phone') ? t('validation.invalid') : undefined)
        }
      />
      <Textarea
        label={t('booking.note')}
        fullWidth
        error={!!errors.note || markedFields.includes('note')}
        errorText={
          fieldErrorText(t, errors.note) ??
          (markedFields.includes('note') ? t('validation.invalid') : undefined)
        }
        {...form.register('note')}
      />
      {refusal?.kind === 'text' && (
        <Typography variant="t4" color="red-300" role="alert">
          {t(refusal.key)}
        </Typography>
      )}
      <ActionBar>
        <Button
          type="submit"
          fullWidth
          size="large"
          colorScheme="blue"
          loading={book.isPending}
        >
          {t('booking.book')}
        </Button>
      </ActionBar>
    </form>
  )
}
