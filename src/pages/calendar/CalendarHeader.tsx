import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { IconButton } from 'ted-ui/IconButton/IconButton'
import { TabsRounded } from 'ted-ui/TabsRounded'
import { Typography } from 'ted-ui/Typography'
import { RiArrowLeftSLine, RiArrowRightSLine } from '@remixicon/react'

import type { StaffControllerList200Item } from '@/api/generated.schemas'
import { dayLabel } from '@/dates'
import { StaffPicker } from '@/pages/schedule/StaffPicker'
import { type CalendarView, shiftDate, weekDates } from './calendarSearch'
import styles from './Calendar.module.scss'

const views: CalendarView[] = ['day', 'week']

// Where the calendar is looking: prev / today / next, day or week, and in the
// week view whose week. It only edits the address; the page reads it back.
export function CalendarHeader({
  view,
  date,
  today,
  masters,
  master,
}: {
  view: CalendarView
  date: string
  today: string
  masters: StaffControllerList200Item[]
  master: StaffControllerList200Item | undefined
}) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate({ from: '/calendar' })
  const week = weekDates(date)
  const go = (patch: {
    view?: CalendarView
    date?: string
    staffId?: string
  }) => void navigate({ search: (prev) => ({ ...prev, ...patch }) })

  return (
    <div className={styles.header}>
      <div className={styles.steps}>
        <IconButton
          aria-label={t(`calendar.prev.${view}`)}
          onClick={() => go({ date: shiftDate(date, view, -1) })}
        >
          <RiArrowLeftSLine />
        </IconButton>
        <Button
          variant="ghost"
          colorScheme="black"
          disabled={date === today}
          onClick={() => go({ date: today })}
        >
          {t('calendar.today')}
        </Button>
        <IconButton
          aria-label={t(`calendar.next.${view}`)}
          onClick={() => go({ date: shiftDate(date, view, 1) })}
        >
          <RiArrowRightSLine />
        </IconButton>
        <Typography variant="h5" component="p">
          {view === 'week'
            ? `${dayLabel(week[0], i18n.language)} – ${dayLabel(week[6], i18n.language)}`
            : dayLabel(date, i18n.language)}
        </Typography>
      </div>
      <TabsRounded
        aria-label={t('calendar.view.label')}
        data={views.map((v) => ({ value: v, label: t(`calendar.view.${v}`) }))}
        value={view}
        onChange={(v) => go({ view: v })}
      />
      {view === 'week' && master && masters.length > 1 && (
        <StaffPicker
          options={masters}
          value={master}
          onChange={(s) => go({ staffId: s.id })}
        />
      )}
    </div>
  )
}
