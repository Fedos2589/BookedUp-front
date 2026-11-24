import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { usePublicBookingControllerEmailOff } from '@/api/public-booking/public-booking'
import type { Language } from '@/language'
import { ChannelRow } from './ChannelRow'
import { EmailForm } from './EmailForm'
import type { RowMutation } from './rowMutation'

type Props = {
  token: string
  locale: Language
  // The booking's address, masked; null while it is off.
  email: string | null
  mutation: RowMutation
}

// Email: a button that opens the address field; once on, the masked address.
export function EmailRow({ token, locale, email, mutation }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const emailOff = usePublicBookingControllerEmailOff({ mutation })
  const label = t('notify.email')
  return (
    <ChannelRow
      label={email ? `${label} ${email}` : label}
      on={email !== null}
      loading={emailOff.isPending}
      onTurnOn={() => setOpen(true)}
      onTurnOff={() => emailOff.mutate({ token })}
    >
      {open && (
        <EmailForm
          token={token}
          locale={locale}
          mutation={mutation}
          onSaved={() => setOpen(false)}
        />
      )}
    </ChannelRow>
  )
}
