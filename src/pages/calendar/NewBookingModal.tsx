import { zodResolver } from '@hookform/resolvers/zod'
import { type RefObject, useId, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Combobox } from 'ted-ui/Combobox'
import { Input } from 'ted-ui/Input'
import { Modal } from 'ted-ui/Modal'
import { PhoneNumberField } from 'ted-ui/PhoneNumberField/PhoneNumberField'
import { Typography } from 'ted-ui/Typography'

import { useAppointmentsControllerCreate } from '@/api/appointments/appointments'
import type {
  SlotsControllerSlots200Item,
  StaffControllerList200Item,
} from '@/api/generated.schemas'
import { ApiError } from '@/apiFetch'
import { dateTimeIn, timeIn } from '@/dates'
import { fieldErrorText } from '@/forms/fieldError'
import { useUnsavedInput } from '@/pwa/unsavedInput'
import {
  type BookingForm,
  bookingSchema,
  clientPhone,
  slotKey,
} from './newBooking'
import styles from './Calendar.module.scss'

type Slot = SlotsControllerSlots200Item

// Books one free hour of a master for a client. `slots` are the free hours of
// the shown range; `initial` is the one that was clicked, if any. A slot taken
// in the meantime keeps the dialog open: `onChanged` reloads the grid under it.
export function NewBookingModal({
  businessId,
  timeZone,
  slots,
  masters,
  initial,
  finalFocus,
  onChanged,
  onClose,
}: {
  businessId: string
  timeZone: string
  slots: Slot[]
  masters: StaffControllerList200Item[]
  initial?: Slot
  finalFocus: RefObject<HTMLElement | null>
  onChanged: () => void
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const formId = useId()
  // Chosen by key, found in the current list: a slot taken meanwhile leaves the
  // list and is no longer chosen, instead of being sent again.
  const first = initial ?? slots[0]
  const [chosen, setChosen] = useState(first && slotKey(first))
  const slot = slots.find((s) => slotKey(s) === chosen)
  const form = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      clientName: '',
      country: i18n.language === 'ru' ? 'RU' : 'US',
      phone: '',
      note: '',
    },
  })
  const create = useAppointmentsControllerCreate({
    mutation: { onSettled: onChanged },
  })
  const country = useWatch({ control: form.control, name: 'country' })
  const phone = useWatch({ control: form.control, name: 'phone' })
  useUnsavedInput(form.formState.isDirty)

  const label = (s: Slot) =>
    `${masters.find((m) => m.id === s.staffId)?.name ?? ''} · ${dateTimeIn(new Date(s.startsAt), timeZone, i18n.language)}–${timeIn(new Date(s.endsAt), timeZone)}`
  const errors = form.formState.errors

  return (
    <Modal
      isVisible
      title={t('calendar.new.title')}
      onClose={onClose}
      finalFocus={finalFocus}
      buttons={[
        {
          variant: 'ghost',
          colorScheme: 'grey',
          children: t('calendar.new.cancel'),
          onClick: onClose,
        },
        {
          variant: 'solid',
          colorScheme: 'black',
          type: 'submit',
          form: formId,
          loading: create.isPending,
          disabled: !slot,
          children: t('calendar.new.submit'),
        },
      ]}
    >
      <form
        id={formId}
        className={styles.form}
        noValidate
        onSubmit={form.handleSubmit((values) => {
          const phone = clientPhone(values.country, values.phone)
          if (!slot || !phone) return
          create.mutate(
            {
              businessId,
              data: {
                staffId: slot.staffId,
                startsAt: slot.startsAt,
                endsAt: slot.endsAt,
                clientName: values.clientName,
                clientPhone: phone,
                ...(values.note && { note: values.note }),
              },
            },
            { onSuccess: onClose },
          )
        })}
      >
        <Combobox
          label={t('calendar.new.slot')}
          options={slots}
          value={slot ?? null}
          onValueChange={(next) => next && setChosen(slotKey(next))}
          itemToStringLabel={label}
          isItemEqualToValue={(a, b) =>
            a.startsAt === b.startsAt && a.staffId === b.staffId
          }
          getItemKey={slotKey}
          openOnFocus
        />
        {slots.length === 0 && (
          <Typography variant="t4" color="grey-500" role="status">
            {t('calendar.new.noFree')}
          </Typography>
        )}
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
        {create.isError && (
          <Typography variant="t4" color="red-300" role="alert">
            {create.error instanceof ApiError && create.error.status === 409
              ? t('calendar.new.notFree')
              : t('calendar.new.saveFailed')}
          </Typography>
        )}
      </form>
    </Modal>
  )
}
