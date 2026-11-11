import { RiEyeLine, RiEyeOffLine } from '@remixicon/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IconButton } from 'ted-ui/IconButton/IconButton'
import { Input, type InputProps } from 'ted-ui/Input'

// A password field with an eye at its end that shows and hides what was
// typed. The kit's Input end slot holds the kit's IconButton: a toggle
// (aria-pressed) with one name, as screen readers expect of a toggle.
export function PasswordInput(props: Omit<InputProps, 'type' | 'endIcon'>) {
  const { t } = useTranslation()
  const [shown, setShown] = useState(false)

  return (
    <Input
      {...props}
      type={shown ? 'text' : 'password'}
      endIcon={
        <IconButton
          size="small"
          colorScheme="transparent"
          aria-label={t('auth.showPassword')}
          aria-pressed={shown}
          onClick={() => setShown((was) => !was)}
        >
          {shown ? (
            <RiEyeOffLine size={16} aria-hidden />
          ) : (
            <RiEyeLine size={16} aria-hidden />
          )}
        </IconButton>
      }
    />
  )
}
