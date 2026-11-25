import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { ActionBar } from 'ted-ui/ActionBar'
import { Button } from 'ted-ui/Button'
import { Input, Textarea } from 'ted-ui/Input'
import { Typography } from 'ted-ui/Typography'

import { usePublicBookingControllerBook } from '@/api/public-booking/public-booking'
import type { PublicBookingControllerBook201 } from '@/api/generated.schemas'
import { dateTimeIn, timeIn } from '@/dates'
import { fieldErrorText } from '@/forms/fieldError'
import { useUnsavedInput } from '@/pwa/unsavedInput'
import { refusalOf } from './bookRefusal'
import styles from './BookingPage.module.scss'
import { ConfirmPhone } from './ConfirmPhone'
import { ContactsPhone } from './ContactsPhone'
import {
  bookBody,
  type ContactsForm,
  contactsDefaults,
  contactsSchema,
} from './contactsForm'
import { type PickerSlot, slotOfKey } from './slotsForPicker'
import { useClientSession } from './useClientSession'
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
    defaultValues: contactsDefaults,
  })
  const errors = form.formState.errors
  useUnsavedInput(form.formState.isDirty)
  // The phone is the one confirmed in Telegram (the session). `confirming`: the
  // client is on their way to the bot; it also covers a session that ran out.
  const session = useClientSession()
  const [confirming, setConfirming] = useState(false)
  const signedIn = session.phone !== null && !confirming
  // The page's callbacks sit on the hook, not on mutate(): they still run if
  // this step is gone by the time the back answers.
  const book = usePublicBookingControllerBook({
    mutation: {
      onSuccess: onBooked,
      onError: (error) => {
        const refusal = refusalOf(error)
        if (refusal.kind === 'taken') return onTaken()
        if (refusal.kind === 'signIn') {
          void session.refresh()
          return setConfirming(true)
        }
        if (refusal.kind !== 'fields') return
        for (const field of refusal.fields)
          form.setError(field, { message: 'validation.invalid' })
        form.setFocus(refusal.fields[0])
      },
    },
  })

  const { startsAt, endsAt } = slotOfKey(slot.id)
  const when = [
    dateTimeIn(new Date(startsAt), timeZone, i18n.language),
    timeIn(new Date(endsAt), timeZone),
  ].join('–')
  const who = master ?? slot.master ?? t('booking.anyMaster')

  const refusal = book.isError ? refusalOf(book.error) : undefined

  const submit = (values: ContactsForm) =>
    book.mutate({ slug, data: bookBody(slot.id, values) })

  // A failed submit puts focus on the first field to fix.
  const invalid = (fields: typeof errors) => {
    const first = (['name', 'note'] as const).find((f) => fields[f])
    if (first) form.setFocus(first)
  }

  const confirmed = () =>
    void session.refresh().then(() => setConfirming(false))
  const notYours = () => {
    setConfirming(false)
    session.signOut()
  }

  return (
    <form
      noValidate
      className={styles.form}
      onSubmit={form.handleSubmit(submit, invalid)}
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
        error={!!errors.name}
        errorText={fieldErrorText(t, errors.name)}
        {...form.register('name')}
      />
      {signedIn && session.phone && (
        <ContactsPhone phone={session.phone} onNotYours={notYours} />
      )}
      <Textarea
        label={t('booking.note')}
        fullWidth
        error={!!errors.note}
        errorText={fieldErrorText(t, errors.note)}
        {...form.register('note')}
      />
      {refusal?.kind === 'text' && (
        <Typography variant="t4" color="red-300" role="alert">
          {t(refusal.key)}
        </Typography>
      )}
      <ActionBar>
        {signedIn && (
          <Button
            type="submit"
            fullWidth
            size="large"
            colorScheme="blue"
            loading={book.isPending}
          >
            {t('booking.book')}
          </Button>
        )}
        {!signedIn && confirming && <ConfirmPhone onConfirmed={confirmed} />}
        {!signedIn && !confirming && (
          <Button
            type="button"
            fullWidth
            size="large"
            colorScheme="blue"
            loading={session.isLoading}
            onClick={() => setConfirming(true)}
          >
            {t('booking.confirmPhone')}
          </Button>
        )}
      </ActionBar>
    </form>
  )
}
