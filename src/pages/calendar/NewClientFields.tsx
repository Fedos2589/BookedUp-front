import type { CountryCode } from 'libphonenumber-js'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from 'ted-ui/Input'
import { PhoneNumberField } from 'ted-ui/PhoneNumberField/PhoneNumberField'
import { Radio } from 'ted-ui/Radio/Radio'
import { RadioGroup } from 'ted-ui/RadioGroup/RadioGroup'
import { Typography } from 'ted-ui/Typography'

import styles from './Calendar.module.scss'

type Person = { id: string; name: string }

// A person not in the base yet: the phone first, because a number that is
// already a client shows its people to choose from (or «a new person on this
// number»); the name is asked only when a new person is being made.
export function NewClientFields({
  name,
  country,
  phone,
  account,
  choice,
  onName,
  onCountry,
  onPhone,
  onChoice,
}: {
  name: string
  country: CountryCode
  phone: string
  account: Person[] | undefined
  choice: string | undefined
  onName: (name: string) => void
  onCountry: (country: CountryCode) => void
  onPhone: (phone: string) => void
  onChoice: (choice: string) => void
}) {
  const { t } = useTranslation()
  const legendId = useId()
  const known = !!account && account.length > 0
  const asksName = !known || choice === 'new'

  return (
    <>
      <PhoneNumberField
        label={t('calendar.new.phone')}
        country={country}
        nationalNumber={phone}
        onCountryChange={onCountry}
        onNationalNumberChange={onPhone}
      />
      {known && (
        <fieldset className={styles.pickerGroup}>
          <Typography variant="t4" component="legend" id={legendId}>
            {t('calendar.picker.account')}
          </Typography>
          <RadioGroup
            aria-labelledby={legendId}
            value={choice ?? ''}
            onValueChange={(value) => onChoice(String(value))}
          >
            {account.map((person) => (
              <Radio key={person.id} value={person.id} label={person.name} />
            ))}
            <Radio value="new" label={t('calendar.picker.newPerson')} />
          </RadioGroup>
        </fieldset>
      )}
      {asksName && (
        <Input
          label={t('calendar.new.name')}
          fullWidth
          value={name}
          onChange={(event) => onName(event.target.value)}
        />
      )}
    </>
  )
}
