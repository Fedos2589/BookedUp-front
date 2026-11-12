import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { TabsRounded } from 'ted-ui/TabsRounded'
import { Typography } from 'ted-ui/Typography'

import type {
  StaffControllerList200Item,
  StaffScheduleControllerSetModeBodyMode,
} from '@/api/generated.schemas'
import { useStaffScheduleControllerSetMode } from '@/api/schedule/schedule'
import { getStaffControllerListQueryKey } from '@/api/staff/staff'
import { useCurrentBusiness } from '@/business/currentBusiness'

// One-to-one hours or groups: what the master's schedule is made of. The list
// answer is the truth, so the tab follows it and not the click.
export function ModeSwitch({ staff }: { staff: StaffControllerList200Item }) {
  const { t } = useTranslation()
  const { id: businessId } = useCurrentBusiness()
  const queryClient = useQueryClient()
  const setMode = useStaffScheduleControllerSetMode({
    mutation: {
      onSettled: () =>
        queryClient.invalidateQueries({
          queryKey: getStaffControllerListQueryKey(businessId),
        }),
    },
  })
  const modes: StaffScheduleControllerSetModeBodyMode[] = ['HOURS', 'GROUPS']

  return (
    <>
      <TabsRounded
        aria-label={t('schedule.mode.label')}
        data={modes.map((mode) => ({
          value: mode,
          label: t(`schedule.mode.${mode}`),
          disabled: setMode.isPending,
        }))}
        value={staff.scheduleMode}
        onChange={(mode) =>
          mode !== staff.scheduleMode &&
          setMode.mutate({ businessId, staffId: staff.id, data: { mode } })
        }
      />
      {setMode.isError && (
        <Typography variant="t4" color="red-300" role="alert">
          {t('schedule.mode.failed')}
        </Typography>
      )}
    </>
  )
}
