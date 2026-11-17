import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { ScheduleGrid, visibleRange } from 'ted-ui/ScheduleGrid'
import { Spinner } from 'ted-ui/Spinner/Spinner'
import { Typography } from 'ted-ui/Typography'

import type { StaffControllerList200Item } from '@/api/generated.schemas'
import { dayLabel } from '@/dates'
import { type CalendarView, weekDates } from './calendarSearch'
import styles from './Calendar.module.scss'
import { toColumns } from './toColumns'
import { useCalendarData } from './useCalendarData'

// With nothing on the day the grid shows the working day, not 24 hours.
const emptyDay = { startMinute: 8 * 60, endMinute: 20 * 60 }

// The grid of a day (a column per master) or of a week (the master's days),
// loaded with the past meetings. Loading and a failed load are its own states.
export function CalendarGrid({
  businessId,
  timeZone,
  view,
  date,
  masters,
  master,
}: {
  businessId: string
  timeZone: string
  view: CalendarView
  date: string
  masters: StaffControllerList200Item[]
  master: StaffControllerList200Item
}) {
  const { t, i18n } = useTranslation()
  const dates = view === 'week' ? weekDates(date) : [date]
  const data = useCalendarData(businessId, {
    from: dates[0],
    to: dates[dates.length - 1],
    staffId: view === 'week' ? master.id : undefined,
  })

  if (data.isError) {
    return (
      <div className={styles.failed}>
        <Typography variant="t4" color="red-300" role="alert">
          {t('calendar.loadFailed')}
        </Typography>
        <Button variant="ghost" colorScheme="black" onClick={data.refetch}>
          {t('common.tryAgain')}
        </Button>
      </div>
    )
  }
  if (!data.appointments || !data.slots) {
    return <Spinner size="medium" aria-label={t('common.loading')} />
  }

  const columns = toColumns({
    range:
      view === 'week'
        ? { view, dates, master }
        : { view, date, staff: masters },
    appointments: data.appointments,
    slots: data.slots,
    timeZone,
    labels: {
      day: (d) => dayLabel(d, i18n.language),
      seats: (title, free, capacity) =>
        t('calendar.seats', {
          title: title ?? t('calendar.meeting'),
          free,
          capacity,
        }),
    },
  })
  const range = visibleRange(
    columns.flatMap((c) => c.items),
    emptyDay,
  )

  return (
    <ScheduleGrid
      aria-label={t('calendar.grid')}
      columns={columns}
      startMinute={range.startMinute}
      endMinute={range.endMinute}
    />
  )
}
