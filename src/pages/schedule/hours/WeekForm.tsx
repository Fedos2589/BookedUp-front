import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActionBar } from 'ted-ui/ActionBar'
import { Button } from 'ted-ui/Button'
import { Typography } from 'ted-ui/Typography'

import {
  getStaffScheduleControllerWeeklyQueryKey,
  useStaffScheduleControllerReplaceWeekly,
} from '@/api/schedule/schedule'
import { useCurrentBusiness } from '@/business/currentBusiness'
import { useUnsavedInput } from '@/pwa/unsavedInput'
import styles from '@/pages/schedule/Schedule.module.scss'
import { DayRow } from './DayRow'
import { focusFirstInvalid } from './focusFirstInvalid'
import { SlotStep } from './SlotStep'
import {
  fromWindows,
  toWindows,
  validateWeek,
  type Week,
  type WindowDto,
} from './weekModel'

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

const same = (a: Week, b: Week) => JSON.stringify(a) === JSON.stringify(b)

export function WeekForm({
  staffId,
  windows,
}: {
  staffId: string
  windows: readonly WindowDto[]
}) {
  const { t } = useTranslation()
  const { id: businessId } = useCurrentBusiness()
  const queryClient = useQueryClient()
  const [saved, setSaved] = useState(() => fromWindows(windows))
  const [week, setWeek] = useState(saved)
  const [tried, setTried] = useState(false)
  const save = useStaffScheduleControllerReplaceWeekly()
  const formRef = useRef<HTMLFormElement>(null)

  const dirty = !same(week, saved)
  useUnsavedInput(dirty)
  const errors = validateWeek(week)

  const submit = () => {
    setTried(true)
    if (errors.length > 0) return focusFirstInvalid(formRef.current)
    save.mutate(
      { businessId, staffId, data: { windows: toWindows(week) } },
      {
        onSuccess: (answer) => {
          queryClient.setQueryData(
            getStaffScheduleControllerWeeklyQueryKey(businessId, staffId),
            answer,
          )
          const next = fromWindows(answer.windows)
          setSaved(next)
          setWeek(next)
          setTried(false)
        },
      },
    )
  }
  const cancel = () => {
    setWeek(saved)
    setTried(false)
    save.reset()
  }

  return (
    <form
      ref={formRef}
      className={styles.hours}
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <Typography variant="h5" component="h2">
        {t('schedule.hours.title')}
      </Typography>
      {/* Typed while the request runs would be wiped by its answer. */}
      <fieldset disabled={save.isPending} className={styles.group}>
        {week.days.map((day, index) => (
          <DayRow
            key={index}
            index={index}
            name={t(`schedule.weekday.${WEEKDAYS[index]}`)}
            day={day}
            errors={tried ? errors.filter((e) => e.weekday === index + 1) : []}
            onChange={setWeek}
            week={week}
          />
        ))}
        <SlotStep
          value={week.slotMinutes}
          onChange={(slotMinutes) => setWeek({ ...week, slotMinutes })}
        />
      </fieldset>
      {save.isError && (
        <Typography variant="t4" color="red-300" role="alert">
          {t('schedule.hours.saveFailed')}
        </Typography>
      )}
      <ActionBar>
        <Button
          type="submit"
          variant="solid"
          colorScheme="black"
          disabled={!dirty}
          loading={save.isPending}
        >
          {t('common.save')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          colorScheme="black"
          disabled={!dirty || save.isPending}
          onClick={cancel}
        >
          {t('common.cancel')}
        </Button>
      </ActionBar>
    </form>
  )
}
