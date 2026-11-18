import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { ScheduleGrid, visibleRange } from 'ted-ui/ScheduleGrid'
import { Spinner } from 'ted-ui/Spinner/Spinner'
import { Typography } from 'ted-ui/Typography'

import type {
  SlotsControllerSlots200Item as Slot,
  StaffControllerList200Item,
} from '@/api/generated.schemas'
import { dayLabel } from '@/dates'
import { useNow } from '@/useNow'
import { type CalendarView, weekDates } from './calendarSearch'
import { BookingModal } from './BookingModal'
import { NewBookingModal } from './NewBookingModal'
import { joinMode, meetingOf } from './meetingOf'
import { freeSlotsOf, slotAt } from './newBooking'
import { SessionModal } from './SessionModal'
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
  const now = useNow()
  const newButton = useRef<HTMLButtonElement>(null)
  // Where focus returns after a meeting's dialog: the grid items cannot take it.
  const gridBox = useRef<HTMLDivElement>(null)
  // The new-booking dialog, for the slot that was clicked, if any.
  const [booking, setBooking] = useState<{ slot?: Slot }>()
  // The grid item whose dialog is open: a meeting's seats, or one booking.
  const [openItem, setOpenItem] = useState<string>()
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
    now,
    labels: {
      ended: (text) => t('calendar.ended', { text }),
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

  // What can be booked: ahead of now, and of a master with a column on screen.
  const free = freeSlotsOf(data.slots, masters, now)
  // A column is a master (day view) or a date (week view).
  const bookAt = (columnId: string, minute: number) => {
    const slot = slotAt(
      free,
      view === 'week' ? master.id : columnId,
      view === 'week' ? columnId : date,
      minute,
      timeZone,
    )
    if (slot) setBooking({ slot })
  }

  // Looked up in the loaded data, so a reload shows its seats as they are now.
  const meeting = openItem && meetingOf(openItem, data.slots, data.appointments)
  // Or, when the item is a booking of the hours, that booking as loaded now —
  // a cancelled one is gone from the list, and its dialog with it.
  const opened =
    openItem && !meeting
      ? data.appointments.find((a) => a.id === openItem)
      : undefined

  return (
    <>
      <Button
        ref={newButton}
        variant="solid"
        colorScheme="black"
        disabled={free.length === 0}
        onClick={() => setBooking({})}
      >
        {t('calendar.new.button')}
      </Button>
      <div ref={gridBox} tabIndex={-1} className={styles.gridBox}>
        <ScheduleGrid
          aria-label={t('calendar.grid')}
          columns={columns}
          startMinute={range.startMinute}
          endMinute={range.endMinute}
          onEmptyClick={bookAt}
          onItemClick={(_, itemId) => setOpenItem(itemId)}
        />
      </div>
      {meeting && (
        <SessionModal
          businessId={businessId}
          timeZone={timeZone}
          meeting={meeting}
          mode={joinMode(meeting.slot, now, timeZone)}
          ended={new Date(meeting.slot.endsAt) <= now}
          finalFocus={gridBox}
          onChanged={data.refetch}
          onClose={() => setOpenItem(undefined)}
        />
      )}
      {opened && (
        <BookingModal
          businessId={businessId}
          timeZone={timeZone}
          booking={opened}
          masters={masters}
          started={new Date(opened.startsAt) <= now}
          finalFocus={gridBox}
          onChanged={data.refetch}
          onClose={() => setOpenItem(undefined)}
        />
      )}
      {booking && (
        <NewBookingModal
          businessId={businessId}
          timeZone={timeZone}
          slots={free}
          masters={masters}
          initial={booking.slot}
          finalFocus={newButton}
          onChanged={data.refetch}
          onClose={() => setBooking(undefined)}
        />
      )}
    </>
  )
}
