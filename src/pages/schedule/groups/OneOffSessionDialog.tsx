import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useId, useRef, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { DatePicker } from 'ted-ui/DatePicker'
import { Input, Textarea } from 'ted-ui/Input'
import { Modal } from 'ted-ui/Modal'
import { TimePicker } from 'ted-ui/TimePicker'
import { Typography } from 'ted-ui/Typography'

import {
  getGroupsControllerSessionsQueryKey,
  useGroupsControllerAddSession,
} from '@/api/schedule/schedule'
import { useCurrentBusiness } from '@/business/currentBusiness'
import { dateIn } from '@/dates'
import { fieldErrorText } from '@/forms/fieldError'
import styles from '@/pages/schedule/Schedule.module.scss'
import { focusFirstInvalid } from '@/pages/schedule/hours/focusFirstInvalid'
import { useUnsavedInput } from '@/pwa/unsavedInput'
import { conflictTitle } from './conflictTitle'
import { DESCRIPTION_MAX, TITLE_MAX } from './groupForm'
import {
  emptySessionForm,
  sessionSchema,
  toSessionBody,
  type SessionForm,
} from './sessionForm'

// Adds a session that happens once, on a date, with the group's other fields.
export function OneOffSessionDialog({
  staffId,
  onClose,
}: {
  staffId: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { id: businessId, timeZone } = useCurrentBusiness()
  const queryClient = useQueryClient()
  const formId = useId()
  const formRef = useRef<HTMLFormElement>(null)
  // A zone this browser doesn't know: no lower bound.
  const [today] = useState(() => dateIn(new Date(), timeZone))
  const [zoneUnknown, setZoneUnknown] = useState(false)
  const form = useForm<SessionForm>({
    resolver: zodResolver(sessionSchema),
    defaultValues: emptySessionForm,
  })
  // The list refreshes from the hook: it must run even if the dialog was
  // closed while the request was in flight.
  const add = useGroupsControllerAddSession({
    mutation: {
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: getGroupsControllerSessionsQueryKey(businessId, staffId),
        }),
    },
  })

  useUnsavedInput(form.formState.isDirty)
  const { errors } = form.formState

  const submit = (values: SessionForm) => {
    const data = toSessionBody(values, timeZone)
    setZoneUnknown(!data)
    if (!data) return
    add.mutate({ businessId, staffId, data }, { onSuccess: onClose })
  }

  const conflict = conflictTitle(add.error)

  return (
    <Modal
      isVisible
      title={t('schedule.sessions.addTitle')}
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
          loading: add.isPending,
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
        <Input
          label={t('schedule.groups.name')}
          maxLength={TITLE_MAX}
          error={!!errors.title}
          errorText={fieldErrorText(t, errors.title)}
          {...form.register('title')}
        />
        <Textarea
          label={t('schedule.groups.description')}
          placeholder={t('schedule.groups.descriptionHint')}
          maxLength={DESCRIPTION_MAX}
          error={!!errors.description}
          errorText={fieldErrorText(t, errors.description)}
          {...form.register('description')}
        />
        <Controller
          control={form.control}
          name="date"
          render={({ field, fieldState }) => (
            <DatePicker
              label={t('schedule.sessions.date')}
              value={field.value}
              minDate={today}
              error={!!fieldState.error}
              errorText={fieldErrorText(t, fieldState.error)}
              onChange={field.onChange}
            />
          )}
        />
        <Controller
          control={form.control}
          name="startMinute"
          render={({ field, fieldState }) => (
            <TimePicker
              label={t('schedule.groups.start')}
              value={field.value}
              onChange={field.onChange}
              error={!!fieldState.error}
              errorText={fieldErrorText(t, fieldState.error)}
            />
          )}
        />
        <Controller
          control={form.control}
          name="endMinute"
          render={({ field, fieldState }) => (
            <TimePicker
              label={t('schedule.groups.end')}
              value={field.value}
              onChange={field.onChange}
              error={!!fieldState.error}
              errorText={fieldErrorText(t, fieldState.error)}
            />
          )}
        />
        <Input
          label={t('schedule.groups.capacity')}
          type="number"
          inputMode="numeric"
          min={1}
          max={1000}
          error={!!errors.capacity}
          errorText={fieldErrorText(t, errors.capacity)}
          {...form.register('capacity')}
        />
        {zoneUnknown ? (
          <Typography variant="t4" color="red-300" role="alert">
            {t('schedule.sessions.zoneUnknown')}
          </Typography>
        ) : conflict !== undefined ? (
          <Typography variant="t4" color="red-300" role="alert">
            {t('schedule.groups.conflict', { title: conflict })}
          </Typography>
        ) : (
          add.isError && (
            <Typography variant="t4" color="red-300" role="alert">
              {t('schedule.sessions.saveFailed')}
            </Typography>
          )
        )}
      </form>
    </Modal>
  )
}
