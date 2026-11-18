import type { CountryCode } from 'libphonenumber-js'
import { useEffect, useEffectEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Combobox } from 'ted-ui/Combobox'
import { Typography } from 'ted-ui/Typography'

import type { ClientsControllerList200ItemsItem as Client } from '@/api/generated.schemas'
import { useUnsavedInput } from '@/pwa/unsavedInput'
import { useClientSearch } from '@/pages/clients/useClientSearch'
import { type PickerValue, pickerValue } from './pickerValue'
import { NewClientFields } from './NewClientFields'
import { useAccountOf } from './useAccountOf'

// The booking's client: found in the base by name or phone, or a new person
// typed in (and, when their phone is already a client's, a choice among that
// account's people). `onChange` gets what the booking takes, or undefined
// while the inputs are incomplete.
export function ClientPicker({
  error,
  onChange,
}: {
  // The back's refusal of the chosen person, worded.
  error?: string
  onChange: (value: PickerValue | undefined) => void
}) {
  const { t, i18n } = useTranslation()
  const [mode, setMode] = useState<'search' | 'new'>('search')
  const [picked, setPicked] = useState<Client | null>(null)
  const [name, setName] = useState('')
  const [country, setCountry] = useState<CountryCode>(
    i18n.language === 'ru' ? 'RU' : 'US',
  )
  const [phone, setPhone] = useState('')
  const [choice, setChoice] = useState<string>()
  const { query, setQuery, found } = useClientSearch()
  const { account, failed, retrying, retry } = useAccountOf(country, phone)

  useUnsavedInput(!!picked || name !== '' || phone !== '')
  const value = pickerValue({
    mode,
    picked,
    name,
    country,
    phone,
    account,
    choice,
  })
  const report = useEffectEvent(() => onChange(value))
  const key = JSON.stringify(value)
  useEffect(() => {
    report()
  }, [key])

  const describe = (client: Client) =>
    `${client.name} · ${client.phone ?? t('clients.via', { name: client.guardian?.name })}`

  return (
    <>
      {mode === 'search' ? (
        <Combobox
          label={t('calendar.picker.search')}
          options={found}
          value={picked}
          onValueChange={setPicked}
          inputValue={query}
          onInputValueChange={setQuery}
          itemToStringLabel={(client) => client.name}
          isItemEqualToValue={(a, b) => a.id === b.id}
          getItemKey={(client) => client.id}
          renderItem={describe}
          filter={null}
          openOnFocus
        />
      ) : (
        <NewClientFields
          name={name}
          country={country}
          phone={phone}
          account={account}
          lookupFailed={failed}
          retrying={retrying}
          onRetry={retry}
          choice={choice}
          onName={setName}
          onCountry={setCountry}
          onPhone={setPhone}
          onChoice={setChoice}
        />
      )}
      {error && (
        <Typography variant="t4" color="red-300" role="alert">
          {error}
        </Typography>
      )}
      <Button
        variant="ghost"
        colorScheme="black"
        onClick={() => setMode(mode === 'search' ? 'new' : 'search')}
      >
        {t(mode === 'search' ? 'calendar.picker.new' : 'calendar.picker.find')}
      </Button>
    </>
  )
}
