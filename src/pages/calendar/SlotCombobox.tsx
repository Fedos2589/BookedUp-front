import { useTranslation } from 'react-i18next'
import { Combobox } from 'ted-ui/Combobox'
import { Typography } from 'ted-ui/Typography'

import type {
  SlotsControllerSlots200Item as Slot,
  StaffControllerList200Item,
} from '@/api/generated.schemas'
import { slotKey, slotRange } from './newBooking'

// The choice of one free hour: «master · Nov 19, 10:00–11:00», and a note when
// there is none. `pending` while the hours are still loading (no note yet).
export function SlotCombobox({
  slots,
  value,
  masters,
  timeZone,
  pending = false,
  onChange,
}: {
  slots: Slot[]
  value: Slot | undefined
  masters: StaffControllerList200Item[]
  timeZone: string
  pending?: boolean
  onChange: (slot: Slot) => void
}) {
  const { t, i18n } = useTranslation()
  const label = (s: Slot) =>
    `${masters.find((m) => m.id === s.staffId)?.name ?? ''} · ${slotRange(s, timeZone, i18n.language) ?? ''}`

  return (
    <>
      <Combobox
        label={t('calendar.new.slot')}
        options={slots}
        value={value ?? null}
        onValueChange={(next) => next && onChange(next)}
        itemToStringLabel={label}
        isItemEqualToValue={(a, b) =>
          a.startsAt === b.startsAt && a.staffId === b.staffId
        }
        getItemKey={slotKey}
        openOnFocus
      />
      {!pending && slots.length === 0 && (
        <Typography variant="t4" color="grey-500" role="status">
          {t('calendar.new.noFree')}
        </Typography>
      )}
    </>
  )
}
