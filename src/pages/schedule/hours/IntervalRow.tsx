import { RiDeleteBinLine } from '@remixicon/react'
import { useTranslation } from 'react-i18next'
import { IconButton } from 'ted-ui/IconButton/IconButton'
import { TimePicker } from 'ted-ui/TimePicker'

import styles from '@/pages/schedule/Schedule.module.scss'
import {
  endFromInput,
  endToInput,
  removeInterval,
  setInterval,
  setStart,
} from './weekEdit'
import type { Interval, Week, WeekError } from './weekModel'

export function IntervalRow({
  dayIndex,
  at,
  dayName,
  interval,
  week,
  error,
  onChange,
}: {
  dayIndex: number
  at: number
  dayName: string
  interval: Interval
  week: Week
  error: WeekError['code'] | undefined
  onChange: (week: Week) => void
}) {
  const { t } = useTranslation()
  return (
    <div className={styles.interval}>
      <TimePicker
        label={t('schedule.hours.from', { day: dayName })}
        value={interval.start}
        step={week.slotMinutes}
        error={error !== undefined}
        onChange={(start) =>
          start !== null && onChange(setStart(week, dayIndex, at, start))
        }
      />
      <TimePicker
        label={t('schedule.hours.to', { day: dayName })}
        value={endToInput(interval.end)}
        step={week.slotMinutes}
        error={error !== undefined}
        errorText={error && t(`schedule.hours.error.${error}`)}
        onChange={(typed) =>
          typed !== null &&
          onChange(
            setInterval(week, dayIndex, at, {
              end: endFromInput(interval.start, typed),
            }),
          )
        }
      />
      <IconButton
        size="small"
        colorScheme="transparent"
        aria-label={t('schedule.hours.removeInterval', { day: dayName })}
        onClick={() => onChange(removeInterval(week, dayIndex, at))}
      >
        <RiDeleteBinLine />
      </IconButton>
    </div>
  )
}
