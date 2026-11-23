import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { ConfirmDialog } from 'ted-ui/ConfirmDialog'

import {
  getPublicBookingControllerManagedQueryKey,
  usePublicBookingControllerCancel,
} from '@/api/public-booking/public-booking'
import styles from './BookingPage.module.scss'
import { forgetSavedBooking } from './savedBooking'

type Props = { token: string; slug: string }

// «Cancel booking» behind a confirmation. Whatever the answer, the booking is
// asked for again: a cancel refused because the time has passed must show the
// booking as it is now (read-only).
export function CancelBooking({ token, slug }: Props) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [asking, setAsking] = useState(false)
  const opener = useRef<HTMLButtonElement>(null)
  const cancel = usePublicBookingControllerCancel()

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
      <ConfirmDialog
        isVisible={asking}
        colorScheme="red"
        title={t('booking.cancelTitle')}
        confirmLabel={t('booking.cancelConfirm')}
        loading={cancel.isPending}
        finalFocus={opener}
        onClose={() => setAsking(false)}
        onConfirm={() =>
          cancel.mutate(
            { token },
            {
              onSuccess: () => forgetSavedBooking(slug),
              onSettled: () => {
                setAsking(false)
                void queryClient.invalidateQueries({
                  queryKey: getPublicBookingControllerManagedQueryKey(token),
                })
              },
            },
          )
        }
      />
    </>
  )
}
