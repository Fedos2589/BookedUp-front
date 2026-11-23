import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Typography } from 'ted-ui/Typography'

import type {
  PublicBookingControllerBusiness200,
  PublicBookingControllerSlots200Item,
} from '@/api/generated.schemas'
import { anyMasterOffered } from './anyMasterOffered'
import { ANY_MASTER } from './bookingSearch'
import styles from './BookingPage.module.scss'
import { useStepHeading } from './useStepHeading'

type Props = {
  business: PublicBookingControllerBusiness200
  slots: PublicBookingControllerSlots200Item[]
  onPick: (staff: string) => void
}

// Step 1: who to book with. A master with nothing free in the next two weeks
// is shown but dimmed; "any" is for hours masters only (a group meeting has
// its own master).
export function MastersStep({ business, slots, onPick }: Props) {
  const { t } = useTranslation()
  const heading = useStepHeading()
  const free = slots.filter((slot) => !slot.full)
  const anyFree = anyMasterOffered(business.masters, slots)

  return (
    <>
      <Typography variant="t2" component="h2" tabIndex={-1} ref={heading}>
        {t('booking.chooseMaster')}
      </Typography>
      <div className={styles.masters}>
        {anyFree && (
          <Button
            variant="solid"
            colorScheme="outline"
            fullWidth
            onClick={() => onPick(ANY_MASTER)}
          >
            {t('booking.anyMaster')}
          </Button>
        )}
        {business.masters.map((master) => {
          const hasTime = free.some((slot) => slot.staffId === master.id)
          return (
            <Button
              key={master.id}
              variant="solid"
              colorScheme="outline"
              fullWidth
              disabled={!hasTime}
              onClick={() => onPick(master.id)}
            >
              {master.name}
              {!hasTime && ` — ${t('booking.noFreeTime')}`}
            </Button>
          )
        })}
      </div>
    </>
  )
}
