import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Typography } from 'ted-ui/Typography'

import { formatPhone } from './formatPhone'
import styles from './ContactsPhone.module.scss'

// The phone confirmed in Telegram, with a way out when it is someone else's.
export function ContactsPhone({
  phone,
  failed,
  onNotYours,
}: {
  phone: string
  // The last «Not your number?» did not go through.
  failed: boolean
  onNotYours: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className={styles.block}>
      <Typography variant="t3" color="grey-500">
        {t('booking.phone')}
      </Typography>
      <Typography variant="t1">{formatPhone(phone)}</Typography>
      <Button
        type="button"
        variant="ghost"
        colorScheme="blue"
        onClick={onNotYours}
      >
        {t('booking.notYourNumber')}
      </Button>
      {failed && (
        <Typography variant="t4" color="red-300" role="alert">
          {t('booking.signOutFailed')}
        </Typography>
      )}
    </div>
  )
}
