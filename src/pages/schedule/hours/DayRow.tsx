import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Checkbox } from 'ted-ui/Checkbox'
import { Typography } from 'ted-ui/Typography'

import styles from '@/pages/schedule/Schedule.module.scss'
import { IntervalRow } from './IntervalRow'
import { addInterval, setWorking } from './weekEdit'
import type { Day, Week, WeekError } from './weekModel'

// One weekday: «I work» and, when on, its intervals.
export function DayRow({
  index,
  name,
  day,
  week,
  errors,
  onChange,
}: {
  index: number
  name: string
  day: Day
  week: Week
  errors: WeekError[]
  onChange: (week: Week) => void
}) {
  const { t } = useTranslation()
  return (
    <fieldset className={styles.day}>
      <legend className={styles.dayName}>
        <Typography variant="h6" component="span">
          {name}
        </Typography>
      </legend>
      <Checkbox
        label={t('schedule.hours.working')}
        checked={day.working}
        onCheckedChange={(working) =>
          onChange(setWorking(week, index, working))
        }
      />
      {day.working && (
        <div className={styles.intervals}>
          {day.intervals.map((interval, at) => (
            <IntervalRow
              key={at}
              dayIndex={index}
              at={at}
              dayName={name}
              interval={interval}
              week={week}
              error={errors.find((e) => e.index === at)?.code}
              onChange={onChange}
            />
          ))}
          {errors.some((e) => e.code === 'empty') && (
            <Typography variant="t4" color="red-300" role="alert">
              {t('schedule.hours.error.empty')}
            </Typography>
          )}
          <Button
            type="button"
            variant="ghost"
            colorScheme="black"
            size="small"
            onClick={() => onChange(addInterval(week, index))}
          >
            {t('schedule.hours.addInterval')}
          </Button>
        </div>
      )}
    </fieldset>
  )
}
