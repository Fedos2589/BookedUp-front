import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
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
import { fromWindows, toWindows, type Week, type WindowDto } from './weekModel'
import { weekSchema } from './weekSchema'

const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

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
  const form = useForm<Week>({
    resolver: zodResolver(weekSchema),
    defaultValues: fromWindows(windows),
  })
  const save = useStaffScheduleControllerReplaceWeekly()
  const formRef = useRef<HTMLFormElement>(null)

  const dirty = form.formState.isDirty
  useUnsavedInput(dirty)

  const submit = (week: Week) =>
    save.mutate(
      { businessId, staffId, data: { windows: toWindows(week) } },
      {
        onSuccess: (answer) => {
          queryClient.setQueryData(
            getStaffScheduleControllerWeeklyQueryKey(businessId, staffId),
            answer,
          )
          form.reset(fromWindows(answer.windows))
        },
      },
    )
  const cancel = () => {
    form.reset()
    save.reset()
  }

  return (
    <FormProvider {...form}>
      <form
        ref={formRef}
        className={styles.hours}
        noValidate
        onSubmit={(e) =>
          void form.handleSubmit(submit, () =>
            focusFirstInvalid(formRef.current),
          )(e)
        }
      >
        <Typography variant="h5" component="h2">
          {t('schedule.hours.title')}
        </Typography>
        {/* Typed while the request runs would be wiped by its answer. */}
        <fieldset disabled={save.isPending} className={styles.group}>
          {WEEKDAYS.map((day, index) => (
            <DayRow
              key={day}
              index={index}
              name={t(`schedule.weekday.${day}`)}
            />
          ))}
          <SlotStep />
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
    </FormProvider>
  )
}
