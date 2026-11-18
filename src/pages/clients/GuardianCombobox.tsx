import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Combobox } from 'ted-ui/Combobox'

import { useClientsControllerList } from '@/api/clients/clients'
import { useCurrentBusiness } from '@/business/currentBusiness'

type Guardian = { id: string; name: string }

// The choice of the holder a dependent comes with: a search over the
// business's clients (the back filters by `q`); only holders are offered —
// a dependent cannot be a guardian.
export function GuardianCombobox({
  value,
  error,
  errorText,
  onChange,
}: {
  value: Guardian | null
  error?: boolean
  errorText?: string
  onChange: (guardian: Guardian | null) => void
}) {
  const { t } = useTranslation()
  const business = useCurrentBusiness()
  const [query, setQuery] = useState('')
  const found = useClientsControllerList(business.id, {
    q: query.trim() || undefined,
    limit: 20,
  })
  const holders = (found.data?.items ?? [])
    .filter((client) => client.phone)
    .map(({ id, name }) => ({ id, name }))

  return (
    <Combobox
      label={t('clients.form.guardian')}
      options={holders}
      value={value}
      onValueChange={onChange}
      inputValue={query}
      onInputValueChange={setQuery}
      itemToStringLabel={(guardian) => guardian.name}
      isItemEqualToValue={(a, b) => a.id === b.id}
      getItemKey={(guardian) => guardian.id}
      filter={null}
      error={error}
      errorText={errorText}
      openOnFocus
    />
  )
}
