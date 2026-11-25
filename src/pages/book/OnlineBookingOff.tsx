import { RiPhoneLine } from '@remixicon/react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from 'ted-ui/EmptyState'

// The server has no Telegram, so nobody can confirm a phone: no booking online.
export function OnlineBookingOff() {
  const { t } = useTranslation()
  return (
    <EmptyState
      icon={<RiPhoneLine />}
      headingLevel={2}
      title={t('booking.offTitle')}
      text={t('booking.offText')}
    />
  )
}
