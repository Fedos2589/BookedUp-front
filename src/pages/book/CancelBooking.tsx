import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { ConfirmDialog } from 'ted-ui/ConfirmDialog'
import { Typography } from 'ted-ui/Typography'

import styles from './BookingPage.module.scss'
import { changeFailureKey } from './bookRefusal'

type Props = {
  // Cancels the booking; rejects with the refusal. The parent owns the mutation
  // (and what is refetched after it), so a token and an id both fit.
  onCancel: () => Promise<unknown>
  isPending: boolean
}

// «Cancel booking» behind a confirmation. A failure is said under the button.
export function CancelBooking({ onCancel, isPending }: Props) {
  const { t } = useTranslation()
  const [asking, setAsking] = useState(false)
  const [error, setError] = useState<unknown>()
  const opener = useRef<HTMLButtonElement>(null)

  return (
    <>
      <Button
        ref={opener}
        variant="solid"
        colorScheme="red"
        className={styles.retry}
        onClick={() => setAsking(true)}
      >
        {t('booking.cancelBooking')}
      </Button>
      {error !== undefined && (
        <Typography variant="t4" color="red-300" role="alert">
          {t(changeFailureKey(error))}
        </Typography>
      )}
      <ConfirmDialog
        isVisible={asking}
        colorScheme="red"
        title={t('booking.cancelTitle')}
        confirmLabel={t('booking.cancelConfirm')}
        loading={isPending}
        finalFocus={opener}
        onClose={() => setAsking(false)}
        onConfirm={() => {
          setError(undefined)
          onCancel()
            .catch(setError)
            .finally(() => setAsking(false))
        }}
      />
    </>
  )
}
