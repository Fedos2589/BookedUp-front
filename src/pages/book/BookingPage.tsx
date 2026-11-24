import { getRouteApi, useRouter } from '@tanstack/react-router'
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
import { type PickerSlot, pickedSlot } from './slotsForPicker'
import { TimeStep } from './TimeStep'
import { useBookingData } from './useBookingData'
import { useBusinessManifest } from './useBusinessManifest'

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

const route = getRouteApi('/book/$businessSlug')

export function BookingPage() {
  const { businessSlug } = route.useParams()
  const navigate = route.useNavigate()
  const router = useRouter()
  const search = route.useSearch()
  const { i18n } = useTranslation()
  const { business, slots, today } = useBookingData(businessSlug)
  // The time the client had chosen was taken by someone else meanwhile.
  const [taken, setTaken] = useState(false)
  const [booked, setBooked] = useState<PublicBookingControllerBook201>()
  // The time of the contacts step, kept from the moment the client reached it:
  // a refetch of the times (the booking itself takes its seat) must not take
  // the form away from under them.
  const [chosen, setChosen] = useState<PickerSlot>()
  const now = useNow()
  useBusinessManifest(business.data?.slug, business.data?.name)

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

  const wanted =
    staff && search.contacts && chosen?.id !== search.slot
      ? pickedSlot(search.slot, {
          slots: slots.data,
          staff,
          timeZone: business.data.timeZone,
          masters: business.data.masters,
          today,
          language: i18n.language,
        })
      : undefined
  if (wanted) setChosen(wanted)
  const contacts =
    search.contacts && chosen?.id === search.slot ? chosen : undefined

  return (
    <main className={styles.page}>
      <Typography variant="h3" component="h1">
        {business.data.name}
      </Typography>
      {booked && search.done ? (
        <DoneStep booked={booked} business={business.data} />
      ) : contacts ? (
        <ContactsStep
          slug={businessSlug}
          timeZone={business.data.timeZone}
          slot={contacts}
          master={
            business.data.masters.find((m) => m.id === contacts.staffId)?.name
          }
          onTaken={() => {
            setTaken(true)
            void slots.refetch()
            // Back to the time step the client came from; opened by its address
            // there is nothing behind, so the step replaces this one.
            if (router.history.canGoBack()) router.history.back()
            else
              void navigate({ search: { staff: search.staff }, replace: true })
          }}
          onBooked={(result) => {
            saveBooking(businessSlug, {
              manageLink: result.manageLink,
              startsAt: result.booking.startsAt,
            })
            setBooked(result)
            void slots.refetch()
            void navigate({
              search: { staff: search.staff, done: true },
              replace: true,
            })
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
          onPick={(staff) => {
            setTaken(false)
            void navigate({ search: { staff } })
          }}
        />
      )}
    </main>
  )
}
