import { type RefObject, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Combobox } from 'ted-ui/Combobox'
import { Modal } from 'ted-ui/Modal'
import { Typography } from 'ted-ui/Typography'

import { useAppointmentsControllerCreate } from '@/api/appointments/appointments'
import type {
  SlotsControllerSlots200Item,
  StaffControllerList200Item,
} from '@/api/generated.schemas'
import { ApiError } from '@/apiFetch'
import { ClientFields } from './ClientFields'
import { slotKey, slotRange } from './newBooking'
import { useClientForm } from './useClientForm'
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
  const { form, clientOf } = useClientForm()
  const create = useAppointmentsControllerCreate({
    mutation: { onSettled: onChanged },
  })

  const label = (s: Slot) =>
    `${masters.find((m) => m.id === s.staffId)?.name ?? ''} · ${slotRange(s, timeZone, i18n.language) ?? ''}`

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
          const client = clientOf(values)
          if (!slot || !client) return
          create.mutate(
            {
              businessId,
              data: {
                staffId: slot.staffId,
                startsAt: slot.startsAt,
                endsAt: slot.endsAt,
                ...client,
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
        <ClientFields form={form} />
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
