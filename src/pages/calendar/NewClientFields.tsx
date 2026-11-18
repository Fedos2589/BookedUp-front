import type { CountryCode } from 'libphonenumber-js'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Input } from 'ted-ui/Input'
import { PhoneNumberField } from 'ted-ui/PhoneNumberField/PhoneNumberField'
import { Radio } from 'ted-ui/Radio/Radio'
import { RadioGroup } from 'ted-ui/RadioGroup/RadioGroup'
import { Typography } from 'ted-ui/Typography'

import { clientPhone } from './newBooking'
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
  lookupFailed,
  retrying,
  onRetry,
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
  lookupFailed: boolean
  retrying: boolean
  onRetry: () => void
  onName: (name: string) => void
  onCountry: (country: CountryCode) => void
  onPhone: (phone: string) => void
  onChoice: (choice: string) => void
}) {
  const { t } = useTranslation()
  const legendId = useId()
  const known = !!account && account.length > 0
  // A number half typed is not an error yet: it is called one once left.
  const [left, setLeft] = useState(false)
  const invalid = left && phone !== '' && !clientPhone(country, phone)
  const asksName = !known || choice === 'new'

  return (
    <>
      <div onBlur={() => setLeft(true)}>
        <PhoneNumberField
          label={t('calendar.new.phone')}
          country={country}
          nationalNumber={phone}
          onCountryChange={onCountry}
          onNationalNumberChange={onPhone}
          error={invalid}
          errorText={invalid ? t('validation.phone') : undefined}
        />
      </div>
      {lookupFailed && (
        <div className={styles.pickerGroup}>
          <Typography variant="t4" color="red-300" role="alert">
            {t('calendar.picker.lookupFailed')}
          </Typography>
          <Button
            variant="ghost"
            colorScheme="black"
            loading={retrying}
            onClick={onRetry}
          >
            {t('common.tryAgain')}
          </Button>
        </div>
      )}
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
          maxLength={100}
          onChange={(event) => onName(event.target.value)}
        />
      )}
    </>
  )
}
