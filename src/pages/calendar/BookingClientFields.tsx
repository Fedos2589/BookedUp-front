import { useTranslation } from 'react-i18next'
import { Input } from 'ted-ui/Input'

import { ClientPicker } from './ClientPicker'
import { clientRefusalKey } from './newBooking'
import type { useBookingClient } from './useBookingClient'

// The client of a booking: the picker and the booking's own note. `refused` is
// the error of the last attempt, of which the picker words its part.
export function BookingClientFields({
  state,
  refused,
}: {
  state: ReturnType<typeof useBookingClient>
  refused: unknown
}) {
  const { t } = useTranslation()
  const key = clientRefusalKey(refused)

  return (
    <>
      <ClientPicker
        key={state.pickerKey}
        error={key && t(key)}
        onChange={state.setClient}
      />
      <Input
        label={t('calendar.new.note')}
        fullWidth
        maxLength={2000}
        value={state.note}
        onChange={(event) => state.setNote(event.target.value)}
      />
    </>
  )
}
