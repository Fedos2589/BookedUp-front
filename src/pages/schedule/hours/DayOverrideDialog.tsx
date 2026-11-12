import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useId, useRef, useState } from 'react'
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form'
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
import { fieldErrorText } from '@/forms/fieldError'
import { useUnsavedInput } from '@/pwa/unsavedInput'
import styles from '@/pages/schedule/Schedule.module.scss'
import { DayRow } from './DayRow'
import { focusFirstInvalid } from './focusFirstInvalid'
import {
  newOverrideWeek,
  overrideFromWeek,
  weekOfOverride,
} from './overrideModel'
import { overrideSchema, type OverrideForm } from './overrideSchema'
import { SlotStep } from './SlotStep'

// The back's word on a date that is in the past (the picker stops those; this
// is for a day that changed under an open dialog).
const isPastDateAnswer = (error: unknown) =>
  error instanceof ApiError &&
  error.status === 400 &&
  (error.body as { message?: string[] } | undefined)?.message?.some((m) =>
    m.startsWith('date:'),
  ) === true

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
  const form = useForm<OverrideForm>({
    resolver: zodResolver(overrideSchema(override ? [] : takenDates)),
    defaultValues: {
      date: override?.date ?? '',
      ...(override ? weekOfOverride(override.windows) : newOverrideWeek()),
    },
  })
  const working = useWatch({ control: form.control, name: 'days.0.working' })
  const put = useStaffScheduleControllerPutDayOverride()

  useUnsavedInput(true)

  const submit = (values: OverrideForm) =>
    put.mutate(
      {
        businessId,
        staffId,
        date: values.date,
        data: { windows: overrideFromWeek(values) },
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
        onError: (error) => {
          if (!isPastDateAnswer(error)) return
          form.setError('date', { message: 'validation.pastDate' })
          focusFirstInvalid(formRef.current)
        },
      },
    )

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
        onSubmit={(e) =>
          void form.handleSubmit(submit, () =>
            focusFirstInvalid(formRef.current),
          )(e)
        }
      >
        <FormProvider {...form}>
          <Controller
            control={form.control}
            name="date"
            render={({ field, fieldState }) => (
              <DatePicker
                mode="single"
                label={t('schedule.overrides.date')}
                value={field.value}
                minDate={today}
                disabled={!!override}
                error={!!fieldState.error}
                errorText={fieldErrorText(t, fieldState.error)}
                onChange={field.onChange}
              />
            )}
          />
          <DayRow index={0} name={t('schedule.overrides.day')} />
          {working && <SlotStep />}
        </FormProvider>
        {put.isError && !isPastDateAnswer(put.error) && (
          <Typography variant="t4" color="red-300" role="alert">
            {t('schedule.overrides.saveFailed')}
          </Typography>
        )}
      </form>
    </Modal>
  )
}
