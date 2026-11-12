import { useTranslation } from 'react-i18next'
import { Combobox } from 'ted-ui/Combobox'

import type { StaffControllerList200Item } from '@/api/generated.schemas'

// Whose schedule the page shows, among the ones this account may change.
export function StaffPicker({
  options,
  value,
  onChange,
}: {
  options: StaffControllerList200Item[]
  value: StaffControllerList200Item
  onChange: (staff: StaffControllerList200Item) => void
}) {
  const { t } = useTranslation()
  return (
    <Combobox
      label={t('schedule.master')}
      options={options}
      value={value}
      onValueChange={(staff) => staff && onChange(staff)}
      itemToStringLabel={(staff) => staff.name}
      isItemEqualToValue={(a, b) => a.id === b.id}
      getItemKey={(staff) => staff.id}
      openOnFocus
    />
  )
}
