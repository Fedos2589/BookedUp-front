import { RiDeleteBinLine } from '@remixicon/react'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { IconButton } from 'ted-ui/IconButton/IconButton'
import { TimePicker } from 'ted-ui/TimePicker'

import { endFromInput, endToInput } from '@/dates'
import { fieldErrorText } from '@/forms/fieldError'
import styles from '@/pages/schedule/Schedule.module.scss'
import type { Week } from './weekModel'

// One interval of a day, in the week form (react-hook-form context).
export function IntervalRow({
  dayIndex,
  at,
  dayName,
  onRemove,
}: {
  dayIndex: number
  at: number
  dayName: string
  onRemove: () => void
}) {
  const { t } = useTranslation()
  const {
    control,
    getValues,
    setValue,
    formState: { errors },
  } = useFormContext<Week>()
  const step = useWatch({ control, name: 'slotMinutes' })
  const error = errors.days?.[dayIndex]?.intervals?.[at]
  const base = `days.${dayIndex}.intervals.${at}` as const
  return (
    <div className={styles.interval}>
      <Controller
        control={control}
        name={`${base}.start`}
        render={({ field }) => (
          <TimePicker
            label={t('schedule.hours.from', { day: dayName })}
            value={field.value}
            step={step}
            error={!!error}
            onChange={(start) => {
              if (start === null) return
              // The end stays what the form shows (the clock), so moving the
              // start gives the same interval as typing that end after it:
              // night when it falls before.
              const end = getValues(`${base}.end`)
              field.onChange(start)
              setValue(`${base}.end`, endFromInput(start, endToInput(end)), {
                shouldDirty: true,
              })
            }}
          />
        )}
      />
      <Controller
        control={control}
        name={`${base}.end`}
        render={({ field }) => (
          <TimePicker
            label={t('schedule.hours.to', { day: dayName })}
            value={endToInput(field.value)}
            step={step}
            error={!!error}
            errorText={fieldErrorText(t, error)}
            onChange={(typed) =>
              typed !== null &&
              field.onChange(endFromInput(getValues(`${base}.start`), typed))
            }
          />
        )}
      />
      <IconButton
        size="small"
        colorScheme="transparent"
        aria-label={t('schedule.hours.removeInterval', { day: dayName })}
        onClick={onRemove}
      >
        <RiDeleteBinLine />
      </IconButton>
    </div>
  )
}
