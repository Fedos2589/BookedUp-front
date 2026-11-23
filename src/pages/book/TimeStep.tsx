import { useTranslation } from 'react-i18next'
import { ActionBar } from 'ted-ui/ActionBar'
import { Button } from 'ted-ui/Button'
import { SlotPicker } from 'ted-ui/SlotPicker'
import { Typography } from 'ted-ui/Typography'

import type {
  PublicBookingControllerBusiness200,
  PublicBookingControllerSlots200Item,
} from '@/api/generated.schemas'
import styles from './BookingPage.module.scss'
import { useStepHeading } from './useStepHeading'
import { slotsForPicker, type PickerSlot } from './slotsForPicker'

type Props = {
  business: PublicBookingControllerBusiness200
  slots: PublicBookingControllerSlots200Item[]
  today: string
  staff: string
  day: string | undefined
  slot: string | undefined
  onChange: (choice: { day: string; slot: string | undefined }) => void
  onContinue: () => void
  // Shows that the time the client had chosen was just taken.
  taken: boolean
  // The button under the times; «Continue» unless the step ends in something else.
  actionLabel?: string
}

// Step 2: a day and a time. The first day with a free time is chosen until
// the client picks one.
export function TimeStep({
  business,
  slots,
  today,
  staff,
  day,
  slot,
  onChange,
  onContinue,
  taken,
  actionLabel,
}: Props) {
  const { t, i18n } = useTranslation()
  const heading = useStepHeading()

  const days = slotsForPicker({
    slots,
    staff,
    timeZone: business.timeZone,
    masters: business.masters,
    today,
    language: i18n.language,
  })
  const current =
    days.find((d) => d.date === day) ??
    days.find((d) => d.slots.some((s) => !s.full)) ??
    days[0]

  const hintOf = (s: PickerSlot) =>
    [
      s.title,
      s.master,
      s.free && (s.full ? t('booking.full') : t('booking.freeOf', s.free)),
    ]
      .filter(Boolean)
      .join(' · ') || undefined

  const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone

  return (
    <>
      <Typography variant="t2" component="h2" tabIndex={-1} ref={heading}>
        {t('booking.chooseTime')}
      </Typography>
      {taken && (
        <Typography variant="t3" color="red-300" role="status">
          {t('booking.taken')}
        </Typography>
      )}
      <SlotPicker
        className={styles.picker}
        daysLabel={t('booking.daysLabel')}
        slotsLabel={t('booking.timesLabel')}
        emptyText={t('booking.noTimesThisDay')}
        days={days.map((d) => ({
          id: d.date,
          weekday: d.weekday,
          number: d.number,
          today: d.date === today,
          empty: d.slots.length === 0,
        }))}
        day={current.date}
        onDayChange={(date) => onChange({ day: date, slot: undefined })}
        slots={current.slots.map((s) => ({
          id: s.id,
          label: s.time,
          hint: hintOf(s),
          disabled: s.full,
        }))}
        value={slot ?? null}
        onChange={(id) => onChange({ day: current.date, slot: id })}
      />
      {business.timeZone !== browserZone && (
        <Typography variant="t4" color="grey-500" className={styles.zone}>
          {t('booking.zoneNote', { zone: business.timeZone })}
        </Typography>
      )}
      {slot && current.slots.some((s) => s.id === slot && !s.full) && (
        <ActionBar>
          <Button
            fullWidth
            size="large"
            colorScheme="blue"
            onClick={onContinue}
          >
            {actionLabel ?? t('booking.continue')}
          </Button>
        </ActionBar>
      )}
    </>
  )
}
