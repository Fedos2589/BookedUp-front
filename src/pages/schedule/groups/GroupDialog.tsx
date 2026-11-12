import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useId, useRef } from 'react'
import { Controller, useForm, type SubmitErrorHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Input, Textarea } from 'ted-ui/Input'
import { Modal } from 'ted-ui/Modal'
import { TagSelect } from 'ted-ui/TagSelect'
import { TimePicker } from 'ted-ui/TimePicker'
import { Typography } from 'ted-ui/Typography'

import type { GroupsControllerList200Item } from '@/api/generated.schemas'
import {
  getGroupsControllerListQueryKey,
  useGroupsControllerAdd,
  useGroupsControllerChange,
} from '@/api/schedule/schedule'
import { useCurrentBusiness } from '@/business/currentBusiness'
import { weekdayLabel } from '@/dates'
import { fieldErrorText } from '@/forms/fieldError'
import styles from '@/pages/schedule/Schedule.module.scss'
import { focusFirstInvalid } from '@/pages/schedule/hours/focusFirstInvalid'
import { useUnsavedInput } from '@/pwa/unsavedInput'
import { conflictTitle } from './conflictTitle'
import {
  DESCRIPTION_MAX,
  emptyGroupForm,
  fromGroup,
  groupSchema,
  TITLE_MAX,
  toBody,
  type GroupForm,
} from './groupForm'

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7]

// Creates a group, or changes `group`.
export function GroupDialog({
  staffId,
  group,
  onClose,
}: {
  staffId: string
  group?: GroupsControllerList200Item
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const { id: businessId } = useCurrentBusiness()
  const queryClient = useQueryClient()
  const formId = useId()
  const daysId = useId()
  const daysRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const form = useForm<GroupForm>({
    resolver: zodResolver(groupSchema),
    defaultValues: group ? fromGroup(group) : emptyGroupForm,
  })
  // The list refreshes from the hooks: it must run even if the dialog was
  // closed while the request was in flight.
  const refresh = {
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: getGroupsControllerListQueryKey(businessId, staffId),
      }),
  }
  const add = useGroupsControllerAdd({ mutation: refresh })
  const change = useGroupsControllerChange({ mutation: refresh })
  const save = group ? change : add

  useUnsavedInput(form.formState.isDirty)
  const { errors } = form.formState

  const submit = (values: GroupForm) => {
    const data = toBody(values)
    const done = { onSuccess: onClose }
    if (group) {
      change.mutate({ businessId, staffId, groupId: group.id, data }, done)
    } else {
      add.mutate({ businessId, staffId, data }, done)
    }
  }

  // The days are tags, not a field with aria-invalid: when they are the first
  // thing wrong, focus goes to them by hand.
  const onInvalid: SubmitErrorHandler<GroupForm> = (errs) =>
    errs.weekdays && !errs.title && !errs.description
      ? daysRef.current?.querySelector('button')?.focus()
      : focusFirstInvalid(formRef.current)

  const conflict = conflictTitle(save.error)

  return (
    <Modal
      isVisible
      title={t(
        group ? 'schedule.groups.editTitle' : 'schedule.groups.addTitle',
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
          loading: save.isPending,
          children: t('common.save'),
        },
      ]}
    >
      <form
        id={formId}
        ref={formRef}
        className={styles.hours}
        noValidate
        onSubmit={(e) => void form.handleSubmit(submit, onInvalid)(e)}
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
          name="weekdays"
          render={({ field, fieldState }) => (
            <div className={styles.day} ref={daysRef}>
              <Typography variant="t4" component="p" id={daysId}>
                {t('schedule.groups.days')}
              </Typography>
              <TagSelect
                aria-labelledby={daysId}
                options={WEEKDAYS.map((d) => ({
                  value: d,
                  label: weekdayLabel(d, i18n.language),
                }))}
                value={field.value}
                onChange={field.onChange}
              />
              {fieldState.error && (
                <Typography variant="t4" color="red-300" role="alert">
                  {fieldErrorText(t, fieldState.error)}
                </Typography>
              )}
            </div>
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
        {conflict !== undefined ? (
          <Typography variant="t4" color="red-300" role="alert">
            {t('schedule.groups.conflict', { title: conflict })}
          </Typography>
        ) : (
          save.isError && (
            <Typography variant="t4" color="red-300" role="alert">
              {t('schedule.groups.saveFailed')}
            </Typography>
          )
        )}
      </form>
    </Modal>
  )
}
