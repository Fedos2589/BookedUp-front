import {
  Controller,
  useFieldArray,
  useFormContext,
  useWatch,
} from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Checkbox } from 'ted-ui/Checkbox'
import { Typography } from 'ted-ui/Typography'

import { fieldErrorText } from '@/forms/fieldError'
import styles from '@/pages/schedule/Schedule.module.scss'
import { IntervalRow } from './IntervalRow'
import { DEFAULT_INTERVAL, nextInterval, type Week } from './weekModel'

// One weekday of the week form: «I work» and, when on, its intervals.
export function DayRow({ index, name }: { index: number; name: string }) {
  const { t } = useTranslation()
  const {
    control,
    getValues,
    setValue,
    formState: { errors },
  } = useFormContext<Week>()
  const intervals = useFieldArray({
    control,
    name: `days.${index}.intervals`,
  })
  const working = useWatch({ control, name: `days.${index}.working` })
  const emptyDay = errors.days?.[index]
  return (
    <fieldset className={styles.day}>
      <legend className={styles.dayName}>
        <Typography variant="h6" component="span">
          {name}
        </Typography>
      </legend>
      <Controller
        control={control}
        name={`days.${index}.working`}
        render={({ field }) => (
          <Checkbox
            label={t('schedule.hours.working')}
            checked={field.value}
            onCheckedChange={(on) => {
              field.onChange(on)
              if (on && intervals.fields.length === 0)
                intervals.append(
                  { ...DEFAULT_INTERVAL },
                  { shouldFocus: false },
                )
            }}
          />
        )}
      />
      {working && (
        <div className={styles.intervals}>
          {intervals.fields.map((field, at) => (
            <IntervalRow
              key={field.id}
              dayIndex={index}
              at={at}
              dayName={name}
              onRemove={() => {
                // A day without intervals is a day off.
                if (intervals.fields.length === 1)
                  setValue(`days.${index}.working`, false, {
                    shouldDirty: true,
                  })
                intervals.remove(at)
              }}
            />
          ))}
          {emptyDay?.message && (
            <Typography variant="t4" color="red-300" role="alert">
              {fieldErrorText(t, emptyDay)}
            </Typography>
          )}
          <Button
            type="button"
            variant="ghost"
            colorScheme="black"
            size="small"
            onClick={() =>
              intervals.append(
                nextInterval(getValues(`days.${index}.intervals`).at(-1)),
                { shouldFocus: false },
              )
            }
          >
            {t('schedule.hours.addInterval')}
          </Button>
        </div>
      )}
    </fieldset>
  )
}
