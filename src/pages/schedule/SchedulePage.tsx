import { Fragment, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Spinner } from 'ted-ui/Spinner/Spinner'
import { Typography } from 'ted-ui/Typography'

import { useMeControllerMeSuspense } from '@/api/account/account'
import { useMembersControllerList } from '@/api/members/members'
import { useStaffControllerList } from '@/api/staff/staff'
import { useCurrentBusiness } from '@/business/currentBusiness'
import { roleCan } from '@/business/roles'
import { editableStaff } from './editableStaff'
import { ModeSwitch } from './ModeSwitch'
import styles from './Schedule.module.scss'
import { StaffPicker } from './StaffPicker'
import { Groups } from '@/pages/schedule/groups/Groups'
import { DayOverrides } from '@/pages/schedule/hours/DayOverrides'
import { WeeklyHours } from '@/pages/schedule/hours/WeeklyHours'
import { TimeOff } from '@/pages/schedule/timeOff/TimeOff'

// A master's schedule: someone sees their own, whoever manages others also
// picks among them (editableStaff). Under the mode switch goes the mode's
// section (hours: F4–F6, groups: G1–G3).
export function SchedulePage() {
  const { t } = useTranslation()
  const business = useCurrentBusiness()
  const { data: account } = useMeControllerMeSuspense()
  const staff = useStaffControllerList(business.id)
  // The members list is the team managers' (the back's manageTeam): a master
  // edits only their own schedule, which needs no roles.
  const manages = roleCan(business.role, 'viewTeam')
  const members = useMembersControllerList(business.id, {
    query: { enabled: manages },
  })
  const [pickedId, setPickedId] = useState<string>()

  // A reload that fails keeps the data it had: the page stays, not an error.
  const failed =
    (staff.isError && !staff.data) ||
    (manages && members.isError && !members.data)
  const loading = !failed && (staff.isPending || (manages && members.isPending))
  const options =
    staff.data && (members.data || !manages)
      ? editableStaff(
          { userId: account.user.id, role: business.role },
          staff.data,
          members.data ?? [],
        )
      : []
  const current = options.find((s) => s.id === pickedId) ?? options[0]

  return (
    <main className={styles.page}>
      <Typography variant="h3" component="h1">
        {t('schedule.title')}
      </Typography>
      {loading && <Spinner size="medium" aria-label={t('common.loading')} />}
      {failed && (
        <div className={styles.failed}>
          <Typography variant="t4" color="red-300" role="alert">
            {t('schedule.loadFailed')}
          </Typography>
          <Button
            variant="ghost"
            colorScheme="black"
            onClick={() => {
              void staff.refetch()
              if (manages) void members.refetch()
            }}
          >
            {t('common.tryAgain')}
          </Button>
        </div>
      )}
      {!loading && !failed && !current && (
        <Typography variant="t3" component="p">
          {t(manages ? 'schedule.noSchedule' : 'schedule.noScheduleAskOwner')}
        </Typography>
      )}
      {current && (
        <>
          {options.length > 1 && (
            <StaffPicker
              options={options}
              value={current}
              onChange={(s) => setPickedId(s.id)}
            />
          )}
          <Fragment key={current.id}>
            <ModeSwitch staff={current} />
            {current.scheduleMode === 'HOURS' && (
              <>
                <WeeklyHours staffId={current.id} />
                <DayOverrides staffId={current.id} />
              </>
            )}
            {current.scheduleMode === 'GROUPS' && (
              <Groups staffId={current.id} />
            )}
            <TimeOff staffId={current.id} />
          </Fragment>
        </>
      )}
    </main>
  )
}
