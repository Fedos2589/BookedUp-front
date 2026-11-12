import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Spinner } from 'ted-ui/Spinner/Spinner'
import { Typography } from 'ted-ui/Typography'

import { useStaffScheduleControllerWeekly } from '@/api/schedule/schedule'
import { useCurrentBusiness } from '@/business/currentBusiness'
import styles from '@/pages/schedule/Schedule.module.scss'
import { WeekForm } from './WeekForm'

// The master's usual week. The form is made once from the loaded windows and
// then owns the edits, so a background reload cannot overwrite typed input.
export function WeeklyHours({ staffId }: { staffId: string }) {
  const { t } = useTranslation()
  const { id: businessId } = useCurrentBusiness()
  const weekly = useStaffScheduleControllerWeekly(businessId, staffId)

  if (weekly.data)
    return <WeekForm staffId={staffId} windows={weekly.data.windows} />
  if (weekly.isError)
    return (
      <div className={styles.failed}>
        <Typography variant="t4" color="red-300" role="alert">
          {t('schedule.hours.loadFailed')}
        </Typography>
        <Button
          variant="ghost"
          colorScheme="black"
          onClick={() => void weekly.refetch()}
        >
          {t('common.tryAgain')}
        </Button>
      </div>
    )
  return <Spinner size="medium" aria-label={t('common.loading')} />
}
