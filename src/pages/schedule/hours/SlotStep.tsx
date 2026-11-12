import { useId } from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { TagSelect } from 'ted-ui/TagSelect'
import { Typography } from 'ted-ui/Typography'

import type { Week } from './weekModel'

const STEPS = [10, 15, 20, 30, 45, 60]

// How often a client can start inside the hours. A step the API already holds
// (any 5–1440) stays selectable even when it is not a usual one.
export function SlotStep() {
  const { t } = useTranslation()
  const { control } = useFormContext<Week>()
  const labelId = useId()
  return (
    <Controller
      control={control}
      name="slotMinutes"
      render={({ field }) => {
        const steps = STEPS.includes(field.value)
          ? STEPS
          : [...STEPS, field.value].sort((a, b) => a - b)
        return (
          <div>
            <Typography variant="t4" component="p" id={labelId}>
              {t('schedule.hours.slotStep')}
            </Typography>
            <TagSelect
              multiple={false}
              aria-labelledby={labelId}
              options={steps.map((step) => ({
                value: step,
                label: t('schedule.hours.minutes', { count: step }),
              }))}
              value={[field.value]}
              onChange={([step]) => step !== undefined && field.onChange(step)}
            />
          </div>
        )
      }}
    />
  )
}
