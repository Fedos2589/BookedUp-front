import { getRouteApi } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Typography } from 'ted-ui/Typography'

import type {
  PublicBookingControllerBusiness200,
  PublicBookingControllerSlots200Item,
} from '@/api/generated.schemas'
import { ApiError } from '@/apiFetch'
import { PagePending } from '@/pages/PagePending'
import { anyMasterOffered } from './anyMasterOffered'
import { ANY_MASTER } from './bookingSearch'
import styles from './BookingPage.module.scss'
import { LoadFailed } from './LoadFailed'
import { ContactsStep } from './ContactsStep'
import { MastersStep } from './MastersStep'
import { NoSuchPage } from './NoSuchPage'
import { saveBooking } from './savedBooking'
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
      {staff && chosen ? (
        <ContactsStep
          slug={businessSlug}
          timeZone={business.data.timeZone}
          slot={chosen}
          master={
            business.data.masters.find((m) => m.id === chosen.staffId)?.name
          }
          onBooked={({ booking, manageLink }) =>
            saveBooking(businessSlug, {
              manageLink,
              startsAt: booking.startsAt,
            })
          }
        />
      ) : staff ? (
        <TimeStep
          business={business.data}
          slots={slots.data}
          today={today}
          staff={staff}
          day={search.day}
          slot={search.slot}
          // Day and time refine the step: Back leaves it, not each tap.
          onChange={(choice) =>
            void navigate({ search: { staff, ...choice }, replace: true })
          }
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
          business={business.data}
          slots={slots.data}
          onPick={(staff) => void navigate({ search: { staff } })}
        />
      )}
    </main>
  )
}
