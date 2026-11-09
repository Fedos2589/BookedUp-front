import { getRouteApi } from '@tanstack/react-router'
import { Typography } from 'ted-ui/Typography'

const route = getRouteApi('/book/$businessSlug')

export function BookingPage() {
  const { businessSlug } = route.useParams()

  return (
    <main>
      <Typography variant="h3" component="h1">
        Запись: {businessSlug}
      </Typography>
    </main>
  )
}
