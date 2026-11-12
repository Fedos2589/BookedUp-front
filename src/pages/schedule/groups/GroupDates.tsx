import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Modal } from 'ted-ui/Modal'
import { Typography } from 'ted-ui/Typography'

import type { GroupsControllerList200Item } from '@/api/generated.schemas'
import {
  getGroupsControllerListQueryKey,
  useGroupsControllerUncancel,
} from '@/api/schedule/schedule'
import { useCurrentBusiness } from '@/business/currentBusiness'
import { dateIn, dayLabel } from '@/dates'
import styles from '@/pages/schedule/Schedule.module.scss'
import { useNow } from '@/useNow'
import { CancelDateDialog } from './CancelDateDialog'
import { conflictTitle } from './conflictTitle'

// The cancelled sessions of a group, which can be restored, and a way to
// cancel another.
export function GroupDates({
  staffId,
  group,
  onClose,
}: {
  staffId: string
  group: GroupsControllerList200Item
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const { id: businessId, timeZone } = useCurrentBusiness()
  const queryClient = useQueryClient()
  const [cancelling, setCancelling] = useState(false)
  // A zone this browser doesn't know: no way to tell today, so nothing to offer.
  const today = dateIn(useNow(), timeZone)
  const restore = useGroupsControllerUncancel({
    mutation: {
      onSettled: () =>
        queryClient.invalidateQueries({
          queryKey: getGroupsControllerListQueryKey(businessId, staffId),
        }),
    },
  })
  const blocking = conflictTitle(restore.error)
  // The back sends the cancellations from today on, soonest first.
  const cancelled = group.cancellations

  return (
    <Modal
      isVisible
      title={t('schedule.groups.datesTitle', { title: group.title })}
      onClose={onClose}
      buttons={[
        {
          variant: 'solid',
          colorScheme: 'black',
          type: 'button',
          children: t('common.close'),
          onClick: onClose,
        },
      ]}
    >
      <div className={styles.hours}>
        {cancelled.length === 0 && (
          <Typography variant="t4" component="p">
            {t('schedule.groups.noCancelled')}
          </Typography>
        )}
        <ul className={styles.overrides}>
          {cancelled.map((date) => {
            const label = dayLabel(date, i18n.language)
            return (
              <li key={date} className={styles.groupCard}>
                <Typography variant="t3" component="span">
                  {label}
                </Typography>
                <Button
                  type="button"
                  variant="ghost"
                  colorScheme="black"
                  size="small"
                  aria-label={t('schedule.groups.restore', { date: label })}
                  loading={
                    restore.isPending && restore.variables?.date === date
                  }
                  onClick={() =>
                    restore.mutate({
                      businessId,
                      staffId,
                      groupId: group.id,
                      date,
                    })
                  }
                >
                  {t('schedule.groups.restoreShort')}
                </Button>
              </li>
            )
          })}
        </ul>
        <Button
          type="button"
          variant="ghost"
          colorScheme="black"
          size="small"
          disabled={!today}
          onClick={() => {
            restore.reset()
            setCancelling(true)
          }}
        >
          {t('schedule.groups.cancelDay')}
        </Button>
        {blocking !== undefined ? (
          <Typography variant="t4" color="red-300" role="alert">
            {t('schedule.groups.restoreBlocked', { title: blocking })}
          </Typography>
        ) : (
          restore.isError && (
            <Typography variant="t4" color="red-300" role="alert">
              {t('schedule.groups.restoreFailed')}
            </Typography>
          )
        )}
        {cancelling && today && (
          <CancelDateDialog
            staffId={staffId}
            group={group}
            today={today}
            onClose={() => setCancelling(false)}
          />
        )}
      </div>
    </Modal>
  )
}
