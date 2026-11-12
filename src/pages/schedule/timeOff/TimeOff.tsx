import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Spinner } from 'ted-ui/Spinner/Spinner'
import { Typography } from 'ted-ui/Typography'

import {
  getStaffScheduleControllerTimeOffQueryKey,
  useStaffScheduleControllerRemoveTimeOff,
  useStaffScheduleControllerTimeOff,
} from '@/api/schedule/schedule'
import { useCurrentBusiness } from '@/business/currentBusiness'
import { dayLabel } from '@/dates'
import styles from '@/pages/schedule/Schedule.module.scss'
import { TimeOffDialog } from './TimeOffDialog'
import { rangeOfInstants, rangeText } from './timeOffRange'

// «Time off»: a range of days the master isn't available, in both modes. The
// back lists the records not over yet.
export function TimeOff({ staffId }: { staffId: string }) {
  const { t, i18n } = useTranslation()
  const { id: businessId, timeZone } = useCurrentBusiness()
  const queryClient = useQueryClient()
  const list = useStaffScheduleControllerTimeOff(businessId, staffId)
  const [adding, setAdding] = useState(false)
  const remove = useStaffScheduleControllerRemoveTimeOff({
    mutation: {
      onSettled: () =>
        queryClient.invalidateQueries({
          queryKey: getStaffScheduleControllerTimeOffQueryKey(
            businessId,
            staffId,
          ),
        }),
    },
  })

  return (
    <section className={styles.hours}>
      <Typography variant="h5" component="h2">
        {t('schedule.timeOff.title')}
      </Typography>
      {list.isPending && (
        <Spinner size="medium" aria-label={t('common.loading')} />
      )}
      {list.isError && !list.data && (
        <div className={styles.failed}>
          <Typography variant="t4" color="red-300" role="alert">
            {t('schedule.timeOff.loadFailed')}
          </Typography>
          <Button
            variant="ghost"
            colorScheme="black"
            onClick={() => void list.refetch()}
          >
            {t('common.tryAgain')}
          </Button>
        </div>
      )}
      {list.data?.length === 0 && (
        <Typography variant="t4" component="p">
          {t('schedule.timeOff.empty')}
        </Typography>
      )}
      <ul className={styles.overrides}>
        {list.data?.map((record) => {
          const text = rangeText(
            rangeOfInstants(record.startsAt, record.endsAt, timeZone),
            i18n.language,
            timeZone,
            (date) => dayLabel(date, i18n.language),
          )
          return (
            <li key={record.id} className={styles.override}>
              <Typography variant="t3" component="span">
                {text}
              </Typography>
              {record.note && (
                <Typography variant="t3" component="span">
                  {record.note}
                </Typography>
              )}
              <Button
                type="button"
                variant="ghost"
                colorScheme="black"
                size="small"
                aria-label={t('schedule.timeOff.delete', { range: text })}
                disabled={remove.isPending}
                onClick={() =>
                  remove.mutate({ businessId, staffId, id: record.id })
                }
              >
                {t('schedule.timeOff.deleteShort')}
              </Button>
            </li>
          )
        })}
      </ul>
      {remove.isError && (
        <Typography variant="t4" color="red-300" role="alert">
          {t('schedule.timeOff.deleteFailed')}
        </Typography>
      )}
      <Button
        type="button"
        variant="ghost"
        colorScheme="black"
        size="small"
        onClick={() => setAdding(true)}
      >
        {t('schedule.timeOff.add')}
      </Button>
      {adding && (
        <TimeOffDialog staffId={staffId} onClose={() => setAdding(false)} />
      )}
    </section>
  )
}
