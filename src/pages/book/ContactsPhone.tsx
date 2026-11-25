import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Typography } from 'ted-ui/Typography'

import styles from './ConfirmPhone.module.scss'

// The phone confirmed in Telegram, with a way out when it is someone else's.
export function ContactsPhone({
  phone,
  onNotYours,
}: {
  phone: string
  onNotYours: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className={styles.block}>
      <Typography variant="t3" color="grey-500">
        {t('booking.phone')}
      </Typography>
      <Typography variant="t1">{phone}</Typography>
      <Button
        type="button"
        variant="ghost"
        colorScheme="blue"
        onClick={onNotYours}
      >
        {t('booking.notYourNumber')}
      </Button>
    </div>
  )
}
