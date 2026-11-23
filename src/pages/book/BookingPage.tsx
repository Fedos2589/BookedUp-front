import { getRouteApi } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Typography } from 'ted-ui/Typography'

import { ApiError } from '@/apiFetch'
import { PagePending } from '@/pages/PagePending'
import styles from './BookingPage.module.scss'
import { MastersStep } from './MastersStep'
import { NoSuchPage } from './NoSuchPage'
import { useBookingData } from './useBookingData'

const route = getRouteApi('/book/$businessSlug')

export function BookingPage() {
  const { businessSlug } = route.useParams()
  const navigate = route.useNavigate()
  const { t } = useTranslation()
  const { business, slots } = useBookingData(businessSlug)

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

  return (
    <main className={styles.page}>
      <Typography variant="h3" component="h1">
        {business.data.name}
      </Typography>
      <MastersStep
        business={business.data}
        slots={slots.data}
        onPick={(staff) => void navigate({ search: { staff } })}
      />
    </main>
  )
}
