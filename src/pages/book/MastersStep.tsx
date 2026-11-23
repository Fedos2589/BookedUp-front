import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Typography } from 'ted-ui/Typography'

import type {
  PublicBookingControllerBusiness200,
  PublicBookingControllerSlots200Item,
} from '@/api/generated.schemas'
import { ANY_MASTER } from './bookingSearch'
import styles from './BookingPage.module.scss'

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
  const free = slots.filter((slot) => !slot.full)
  const hoursMasters = new Set(
    business.masters
      .filter((master) => master.scheduleMode === 'HOURS')
      .map((master) => master.id),
  )
  const anyFree = free.some(
    (slot) =>
      hoursMasters.has(slot.staffId) &&
      slot.groupId === null &&
      slot.oneOffSessionId === null,
  )

  return (
    <>
      <Typography variant="t2">{t('booking.chooseMaster')}</Typography>
      <div className={styles.masters}>
        {anyFree && (
          <Button
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
