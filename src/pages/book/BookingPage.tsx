import { getRouteApi } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Typography } from 'ted-ui/Typography'

import { ANY_MASTER } from './bookingSearch'
import { ApiError } from '@/apiFetch'
import { PagePending } from '@/pages/PagePending'
import styles from './BookingPage.module.scss'
import { MastersStep } from './MastersStep'
import { NoSuchPage } from './NoSuchPage'
import { TimeStep } from './TimeStep'
import { useBookingData } from './useBookingData'

// An address naming a master the business doesn't have is the first step.
const knownStaff = (staff: string | undefined, masters: { id: string }[]) =>
  staff === ANY_MASTER || masters.some((master) => master.id === staff)
    ? staff
    : undefined

const route = getRouteApi('/book/$businessSlug')

export function BookingPage() {
  const { businessSlug } = route.useParams()
  const navigate = route.useNavigate()
  const { t } = useTranslation()
  const search = route.useSearch()
  const { business, slots, today } = useBookingData(businessSlug)

  if (business.error instanceof ApiError && business.error.status === 404) {
    return <NoSuchPage />
  }
  if (business.isError || slots.isError) {
    return (
      <main className={styles.page}>
        <Typography variant="t2">{t('booking.loadFailed')}</Typography>
        <Button
          onClick={() => {
            void business.refetch()
            void slots.refetch()
          }}
        >
          {t('common.tryAgain')}
        </Button>
      </main>
    )
  }
  if (!business.data || !slots.data) return <PagePending />

  const staff = knownStaff(search.staff, business.data.masters)

  return (
    <main className={styles.page}>
      <Typography variant="h3" component="h1">
        {business.data.name}
      </Typography>
      {staff ? (
        <TimeStep
          business={business.data}
          slots={slots.data}
          today={today}
          staff={staff}
          day={search.day}
          slot={search.slot}
          onChange={(choice) => void navigate({ search: { staff, ...choice } })}
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
