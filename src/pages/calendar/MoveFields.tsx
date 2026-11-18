import { useTranslation } from 'react-i18next'
import { DatePicker } from 'ted-ui/DatePicker'
import { Typography } from 'ted-ui/Typography'

import type { StaffControllerList200Item } from '@/api/generated.schemas'
import { ApiError } from '@/apiFetch'
import styles from './Calendar.module.scss'
import { SlotCombobox } from './SlotCombobox'
import type { useMoveBooking } from './useMoveBooking'

// The body of the move step: the day, the free hour, what went wrong. Its
// submit button is the dialog's footer button, tied to this form by `formId`.
export function MoveFields({
  formId,
  state,
  masters,
  timeZone,
}: {
  formId: string
  state: ReturnType<typeof useMoveBooking>
  masters: StaffControllerList200Item[]
  timeZone: string
}) {
  const { t } = useTranslation()
  const { move } = state

  return (
    <form
      id={formId}
      className={styles.form}
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        state.submit()
      }}
    >
      <DatePicker
        mode="single"
        label={t('calendar.move.date')}
        value={state.date}
        minDate={state.today}
        onChange={state.chooseDate}
      />
      <SlotCombobox
        slots={state.slots}
        value={state.slot}
        masters={masters}
        timeZone={timeZone}
        pending={state.pending}
        onChange={state.choose}
      />
      {move.isError && (
        <Typography variant="t4" color="red-300" role="alert">
          {move.error instanceof ApiError && move.error.status === 409
            ? t('calendar.new.notFree')
            : t('calendar.move.failed')}
        </Typography>
      )}
    </form>
  )
}
