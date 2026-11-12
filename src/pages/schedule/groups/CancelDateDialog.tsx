import { useQueryClient } from '@tanstack/react-query'
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from 'ted-ui/Modal'
import { Radio } from 'ted-ui/Radio/Radio'
import { RadioGroup } from 'ted-ui/RadioGroup/RadioGroup'
import { Typography } from 'ted-ui/Typography'

import type { GroupsControllerList200Item } from '@/api/generated.schemas'
import {
  getGroupsControllerListQueryKey,
  useGroupsControllerCancel,
} from '@/api/schedule/schedule'
import { useCurrentBusiness } from '@/business/currentBusiness'
import { dayLabel } from '@/dates'
import { nextMeetings } from './groupDays'

const OFFERED = 8

// Cancels one session of a group: only the days it meets, as the back refuses
// any other.
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
  const { t, i18n } = useTranslation()
  const { id: businessId } = useCurrentBusiness()
  const queryClient = useQueryClient()
  const formId = useId()
  const [date, setDate] = useState<string>()
  const cancel = useGroupsControllerCancel({
    mutation: {
      onSuccess: () =>
        queryClient.invalidateQueries({
          queryKey: getGroupsControllerListQueryKey(businessId, staffId),
        }),
    },
  })

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
          cancel.mutate(
            { businessId, staffId, groupId: group.id, date },
            { onSuccess: onClose },
          )
        }}
      >
        <RadioGroup
          aria-label={t('schedule.groups.cancelTitle')}
          value={date ?? ''}
          onValueChange={(v) => setDate(String(v))}
        >
          {nextMeetings(group, today, OFFERED).map((d) => (
            <Radio key={d} value={d} label={dayLabel(d, i18n.language)} />
          ))}
        </RadioGroup>
        {cancel.isError && (
          <Typography variant="t4" color="red-300" role="alert">
            {t('schedule.groups.cancelFailed')}
          </Typography>
        )}
      </form>
    </Modal>
  )
}
