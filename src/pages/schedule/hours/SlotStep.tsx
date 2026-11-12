import { useTranslation } from 'react-i18next'
import { TagSelect } from 'ted-ui/TagSelect'
import { Typography } from 'ted-ui/Typography'

const STEPS = [10, 15, 20, 30, 45, 60]

// How often a client can start inside the hours. A step the API already holds
// (any 5–1440) stays selectable even when it is not a usual one.
export function SlotStep({
  value,
  onChange,
}: {
  value: number
  onChange: (minutes: number) => void
}) {
  const { t } = useTranslation()
  const steps = STEPS.includes(value)
    ? STEPS
    : [...STEPS, value].sort((a, b) => a - b)
  return (
    <div>
      <Typography variant="t4" component="p" id="slot-step">
        {t('schedule.hours.slotStep')}
      </Typography>
      <TagSelect
        multiple={false}
        aria-labelledby="slot-step"
        options={steps.map((step) => ({
          value: step,
          label: t('schedule.hours.minutes', { count: step }),
        }))}
        value={[value]}
        onChange={([step]) => step !== undefined && onChange(step)}
      />
    </div>
  )
}
