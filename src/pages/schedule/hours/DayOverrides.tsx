import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Spinner } from 'ted-ui/Spinner/Spinner'
import { Typography } from 'ted-ui/Typography'

import type { StaffScheduleControllerDayOverrides200Item as Override } from '@/api/generated.schemas'
import {
  getStaffScheduleControllerDayOverridesQueryKey,
  useStaffScheduleControllerDayOverrides,
  useStaffScheduleControllerRemoveDayOverride,
} from '@/api/schedule/schedule'
import { useCurrentBusiness } from '@/business/currentBusiness'
import { dayLabel } from '@/dates'
import styles from '@/pages/schedule/Schedule.module.scss'
import { DayOverrideDialog } from './DayOverrideDialog'
import { intervalsText } from './overrideModel'

// «Separate dates»: a day that replaces its weekday whole — other hours, or a
// day off. The back lists only today and later.
export function DayOverrides({ staffId }: { staffId: string }) {
  const { t, i18n } = useTranslation()
  const { id: businessId } = useCurrentBusiness()
  const queryClient = useQueryClient()
  const list = useStaffScheduleControllerDayOverrides(businessId, staffId)
  // 'new': a blank dialog; an override: editing that date.
  const [dialog, setDialog] = useState<Override | 'new'>()
  const remove = useStaffScheduleControllerRemoveDayOverride({
    mutation: {
      onSettled: () =>
        queryClient.invalidateQueries({
          queryKey: getStaffScheduleControllerDayOverridesQueryKey(
            businessId,
            staffId,
          ),
        }),
    },
  })

  return (
    <section className={styles.hours}>
      <Typography variant="h5" component="h2">
        {t('schedule.overrides.title')}
      </Typography>
      {list.isPending && (
        <Spinner size="medium" aria-label={t('common.loading')} />
      )}
      {list.isError && !list.data && (
        <div className={styles.failed}>
          <Typography variant="t4" color="red-300" role="alert">
            {t('schedule.overrides.loadFailed')}
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
          {t('schedule.overrides.empty')}
        </Typography>
      )}
      <ul className={styles.overrides}>
        {list.data?.map((override) => {
          const label = dayLabel(override.date, i18n.language)
          return (
            <li key={override.date} className={styles.override}>
              <Typography variant="t3" component="span">
                {label}
              </Typography>
              <Typography variant="t3" component="span">
                {intervalsText(override.windows) ??
                  t('schedule.overrides.dayOff')}
              </Typography>
              <Button
                type="button"
                variant="ghost"
                colorScheme="black"
                size="small"
                aria-label={t('schedule.overrides.edit', { date: label })}
                onClick={() => setDialog(override)}
              >
                {t('schedule.overrides.editShort')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                colorScheme="black"
                size="small"
                aria-label={t('schedule.overrides.delete', { date: label })}
                disabled={remove.isPending}
                onClick={() =>
                  remove.mutate({ businessId, staffId, date: override.date })
                }
              >
                {t('schedule.overrides.deleteShort')}
              </Button>
            </li>
          )
        })}
      </ul>
      {remove.isError && (
        <Typography variant="t4" color="red-300" role="alert">
          {t('schedule.overrides.deleteFailed')}
        </Typography>
      )}
      <Button
        type="button"
        variant="ghost"
        colorScheme="black"
        size="small"
        onClick={() => setDialog('new')}
      >
        {t('schedule.overrides.add')}
      </Button>
      {dialog && (
        <DayOverrideDialog
          staffId={staffId}
          override={dialog === 'new' ? undefined : dialog}
          takenDates={list.data?.map((o) => o.date) ?? []}
          onClose={() => setDialog(undefined)}
        />
      )}
    </section>
  )
}
