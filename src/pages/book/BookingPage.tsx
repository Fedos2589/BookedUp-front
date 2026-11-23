import { getRouteApi } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Typography } from 'ted-ui/Typography'

import type {
  PublicBookingControllerBook201,
  PublicBookingControllerBusiness200,
  PublicBookingControllerSlots200Item,
} from '@/api/generated.schemas'
import { ApiError } from '@/apiFetch'
import { PagePending } from '@/pages/PagePending'
import { useNow } from '@/useNow'
import { anyMasterOffered } from './anyMasterOffered'
import { ANY_MASTER } from './bookingSearch'
import styles from './BookingPage.module.scss'
import { DoneStep } from './DoneStep'
import { LoadFailed } from './LoadFailed'
import { ContactsStep } from './ContactsStep'
import { MastersStep } from './MastersStep'
import { NoSuchPage } from './NoSuchPage'
import { savedBookingOf, saveBooking } from './savedBooking'
import { slotsForPicker } from './slotsForPicker'
import { TimeStep } from './TimeStep'
import { useBookingData } from './useBookingData'

// An address naming a master the business doesn't have is the first step.
const knownStaff = (
  staff: string | undefined,
  business: PublicBookingControllerBusiness200,
  slots: PublicBookingControllerSlots200Item[],
) => {
  if (staff === ANY_MASTER) {
    return anyMasterOffered(business.masters, slots) ? staff : undefined
  }
  return business.masters.some((master) => master.id === staff)
    ? staff
    : undefined
}

// The chosen time, if the address names one the picker still offers.
const pickedSlot = (
  key: string | undefined,
  input: Parameters<typeof slotsForPicker>[0],
) =>
  slotsForPicker(input)
    .flatMap((day) => day.slots)
    .find((slot) => slot.id === key)

const route = getRouteApi('/book/$businessSlug')

export function BookingPage() {
  const { businessSlug } = route.useParams()
  const navigate = route.useNavigate()
  const search = route.useSearch()
  const { i18n } = useTranslation()
  const { business, slots, today } = useBookingData(businessSlug)
  // The time the client had chosen was taken by someone else meanwhile.
  const [taken, setTaken] = useState(false)
  const [booked, setBooked] = useState<PublicBookingControllerBook201>()
  const now = useNow()

  if (business.error instanceof ApiError && business.error.status === 404) {
    return <NoSuchPage />
  }
  // A failed refetch keeps what is already on screen (the old data stays).
  if ((business.isError && !business.data) || (slots.isError && !slots.data)) {
    return (
      <LoadFailed
        onRetry={() => {
          if (business.isError) void business.refetch()
          if (slots.isError) void slots.refetch()
        }}
      />
    )
  }
  if (!business.data || !slots.data) return <PagePending />

  const staff = knownStaff(search.staff, business.data, slots.data)

  const chosen =
    staff &&
    search.contacts &&
    pickedSlot(search.slot, {
      slots: slots.data,
      staff,
      timeZone: business.data.timeZone,
      masters: business.data.masters,
      today,
      language: i18n.language,
    })

  return (
    <main className={styles.page}>
      <Typography variant="h3" component="h1">
        {business.data.name}
      </Typography>
      {booked ? (
        <DoneStep
          booked={booked}
          businessName={business.data.name}
          timeZone={business.data.timeZone}
        />
      ) : staff && chosen ? (
        <ContactsStep
          slug={businessSlug}
          timeZone={business.data.timeZone}
          slot={chosen}
          master={
            business.data.masters.find((m) => m.id === chosen.staffId)?.name
          }
          onTaken={() => {
            setTaken(true)
            void slots.refetch()
            void navigate({
              search: { staff, day: search.day },
              replace: true,
            })
          }}
          onBooked={(result) => {
            saveBooking(businessSlug, {
              manageLink: result.manageLink,
              startsAt: result.booking.startsAt,
            })
            setBooked(result)
          }}
        />
      ) : staff ? (
        <TimeStep
          taken={taken}
          business={business.data}
          slots={slots.data}
          today={today}
          staff={staff}
          day={search.day}
          slot={search.slot}
          // Day and time refine the step: Back leaves it, not each tap.
          onChange={(choice) => {
            setTaken(false)
            void navigate({ search: { staff, ...choice }, replace: true })
          }}
          onContinue={() =>
            void navigate({
              search: {
                staff,
                day: search.day,
                slot: search.slot,
                contacts: true,
              },
            })
          }
        />
      ) : (
        <MastersStep
          saved={savedBookingOf(businessSlug, now)}
          timeZone={business.data.timeZone}
          business={business.data}
          slots={slots.data}
          onPick={(staff) => void navigate({ search: { staff } })}
        />
      )}
    </main>
  )
}
