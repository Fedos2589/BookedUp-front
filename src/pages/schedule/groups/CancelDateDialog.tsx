import { useQueryClient } from '@tanstack/react-query'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DatePicker } from 'ted-ui/DatePicker'
import { Modal } from 'ted-ui/Modal'
import { Typography } from 'ted-ui/Typography'

import type { GroupsControllerList200Item } from '@/api/generated.schemas'
import {
  getGroupsControllerListQueryKey,
  useGroupsControllerCancel,
} from '@/api/schedule/schedule'
import { useCurrentBusiness } from '@/business/currentBusiness'
import { useUnsavedInput } from '@/pwa/unsavedInput'
import { cancelProblem } from './groupDays'

// Cancels one session of a group, on any day from today on. The picker cannot
// grey out the days the group does not meet, so those are refused on save.
export function CancelDateDialog({
  staffId,
  group,
  today,
  onClose,
}: {
  staffId: string
  group: GroupsControllerList200Item
  today: string
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { id: businessId } = useCurrentBusiness()
  const queryClient = useQueryClient()
  const formId = useId()
  const [date, setDate] = useState('')
  const [problem, setProblem] = useState<'notMeeting' | 'cancelled'>()
  const cancel = useGroupsControllerCancel({
    mutation: {
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: getGroupsControllerListQueryKey(businessId, staffId),
        }),
    },
  })

  useUnsavedInput(date !== '')

  return (
    <Modal
      isVisible
      title={t('schedule.groups.cancelTitle')}
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
          disabled: !date,
          loading: cancel.isPending,
          children: t('schedule.groups.cancelSession'),
        },
      ]}
    >
      <form
        id={formId}
        onSubmit={(e) => {
          e.preventDefault()
          if (!date) return
          const found = cancelProblem(group, date)
          setProblem(found)
          if (found) return
          cancel.mutate(
            { businessId, staffId, groupId: group.id, date },
            { onSuccess: onClose },
          )
        }}
      >
        <DatePicker
          label={t('schedule.groups.cancelDate')}
          value={date}
          minDate={today}
          error={!!problem}
          errorText={problem && t(`schedule.groups.${problem}`)}
          onChange={(value) => {
            setDate(value)
            setProblem(undefined)
          }}
        />
        {cancel.isError && (
          <Typography variant="t4" color="red-300" role="alert">
            {t('schedule.groups.cancelFailed')}
          </Typography>
        )}
      </form>
    </Modal>
  )
}
