import { useQueryClient } from '@tanstack/react-query'
import { useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DatePicker } from 'ted-ui/DatePicker'
import { Modal } from 'ted-ui/Modal'
import { Typography } from 'ted-ui/Typography'

import type { StaffScheduleControllerDayOverrides200Item as Override } from '@/api/generated.schemas'
import {
  getStaffScheduleControllerDayOverridesQueryKey,
  useStaffScheduleControllerPutDayOverride,
} from '@/api/schedule/schedule'
import { ApiError } from '@/apiFetch'
import { useCurrentBusiness } from '@/business/currentBusiness'
import { dateIn } from '@/dates'
import { useUnsavedInput } from '@/pwa/unsavedInput'
import styles from '@/pages/schedule/Schedule.module.scss'
import { DayRow } from './DayRow'
import { focusFirstInvalid } from './focusFirstInvalid'
import { overrideFromWeek, weekOfOverride } from './overrideModel'
import { SlotStep } from './SlotStep'
import { setWorking } from './weekEdit'
import { validateWeek } from './weekModel'

// Adds or edits one date. A new date starts as a working day with the usual
// default interval; unticking «Working» makes it a day off. The date of an
// existing override is its identity, so it is not editable.
export function DayOverrideDialog({
  staffId,
  override,
  takenDates,
  onClose,
}: {
  staffId: string
  takenDates: readonly string[]
  override?: Override
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { id: businessId, timeZone } = useCurrentBusiness()
  const queryClient = useQueryClient()
  const formId = useId()
  // A zone this browser doesn't know: no lower bound, the back refuses a past day.
  const [today] = useState(() => dateIn(new Date(), timeZone))
  const formRef = useRef<HTMLFormElement>(null)
  const [date, setDate] = useState(override?.date ?? '')
  const [week, setWeek] = useState(() =>
    override
      ? weekOfOverride(override.windows)
      : setWorking(weekOfOverride([]), 0, true),
  )
  const [tried, setTried] = useState(false)
  const put = useStaffScheduleControllerPutDayOverride()

  useUnsavedInput(true)
  const errors = validateWeek(week)
  const missingDate = tried && date === ''
  // The date picker stops past dates; this is the back's word if the day
  // changed under an open dialog.
  const past =
    put.error instanceof ApiError &&
    put.error.status === 400 &&
    (put.error.body as { message?: string[] } | undefined)?.message?.some((m) =>
      m.startsWith('date:'),
    ) === true
  // PUT would replace it silently: changing a date is what «Change» is for.
  const taken = !override && takenDates.includes(date)

  const submit = () => {
    setTried(true)
    if (date === '' || taken || errors.length > 0)
      return focusFirstInvalid(formRef.current)
    put.mutate(
      {
        businessId,
        staffId,
        date,
        data: { windows: overrideFromWeek(week) },
      },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({
            queryKey: getStaffScheduleControllerDayOverridesQueryKey(
              businessId,
              staffId,
            ),
          })
          onClose()
        },
      },
    )
  }

  return (
    <Modal
      isVisible
      title={t(
        override
          ? 'schedule.overrides.editTitle'
          : 'schedule.overrides.addTitle',
      )}
      onClose={onClose}
      buttons={[
        {
          variant: 'ghost',
          colorScheme: 'grey',
          type: 'button',
          children: t('common.cancel'),
          onClick: onClose,
        },
        {
          variant: 'solid',
          colorScheme: 'black',
          type: 'submit',
          form: formId,
          loading: put.isPending,
          children: t('common.save'),
        },
      ]}
    >
      <form
        id={formId}
        ref={formRef}
        className={styles.hours}
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <DatePicker
          mode="single"
          label={t('schedule.overrides.date')}
          value={date}
          minDate={today}
          disabled={!!override}
          error={missingDate || past || taken}
          errorText={
            past
              ? t('schedule.overrides.pastDate')
              : taken
                ? t('schedule.overrides.dateTaken')
                : missingDate
                  ? t('schedule.overrides.dateRequired')
                  : undefined
          }
          onChange={setDate}
        />
        <DayRow
          index={0}
          name={t('schedule.overrides.day')}
          day={week.days[0]}
          week={week}
          errors={tried ? errors : []}
          onChange={setWeek}
        />
        {week.days[0].working && (
          <SlotStep
            value={week.slotMinutes}
            onChange={(slotMinutes) => setWeek({ ...week, slotMinutes })}
          />
        )}
        {put.isError && !past && (
          <Typography variant="t4" color="red-300" role="alert">
            {t('schedule.overrides.saveFailed')}
          </Typography>
        )}
      </form>
    </Modal>
  )
}
