import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { ConfirmDialog } from 'ted-ui/ConfirmDialog'
import { Typography } from 'ted-ui/Typography'

import {
  getPublicBookingControllerManagedQueryKey,
  usePublicBookingControllerCancel,
} from '@/api/public-booking/public-booking'
import styles from './BookingPage.module.scss'
import { changeFailureKey } from './bookRefusal'
import { updateSavedBooking } from './savedBooking'

type Props = { token: string; slug: string }

// «Cancel booking» behind a confirmation. Whatever the answer, the booking is
// asked for again: a cancel refused because the time has passed must show the
// booking as it is now (read-only). Any other failure is said under the button.
export function CancelBooking({ token, slug }: Props) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [asking, setAsking] = useState(false)
  const opener = useRef<HTMLButtonElement>(null)
  // The callbacks sit on the hook, not on mutate(): they still run if the
  // client has left the page by the time the back answers.
  const cancel = usePublicBookingControllerCancel({
    mutation: {
      onSuccess: () => updateSavedBooking(slug, token, null),
      onSettled: () =>
        queryClient.invalidateQueries({
          queryKey: getPublicBookingControllerManagedQueryKey(token),
        }),
    },
  })

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
      {cancel.isError && (
        <Typography variant="t4" color="red-300" role="alert">
          {t(changeFailureKey(cancel.error))}
        </Typography>
      )}
      <ConfirmDialog
        isVisible={asking}
        colorScheme="red"
        title={t('booking.cancelTitle')}
        confirmLabel={t('booking.cancelConfirm')}
        loading={cancel.isPending}
        finalFocus={opener}
        onClose={() => setAsking(false)}
        onConfirm={() => {
          cancel.mutate({ token }, { onSettled: () => setAsking(false) })
        }}
      />
    </>
  )
}
