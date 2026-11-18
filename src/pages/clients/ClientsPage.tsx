import { getRouteApi, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from 'ted-ui/Button'
import { Input } from 'ted-ui/Input'
import { Typography } from 'ted-ui/Typography'

import { ClientsList } from './ClientsList'
import styles from './Clients.module.scss'

const route = getRouteApi('/cabinet/clients')
const SEARCH_DELAY_MS = 300
// The back refuses a longer `q` (400).
const SEARCH_MAX_LENGTH = 100

// The business's clients: a search and the list. The text is typed into the
// field at once and reaches the address (and the back) 300 ms after the last
// key, so Back from a card returns to the same search.
export function ClientsPage() {
  const { t } = useTranslation()
  const { q } = route.useSearch()
  const navigate = useNavigate({ from: '/clients' })
  const [text, setText] = useState(q ?? '')
  const [seenQ, setSeenQ] = useState(q)
  if (q !== seenQ) {
    // The address changed from outside (the nav link, Back): follow it.
    setSeenQ(q)
    if ((text.trim() || undefined) !== q) setText(q ?? '')
  }

  useEffect(() => {
    const wanted = text.trim() || undefined
    if (wanted === q) return
    const timer = setTimeout(
      () => void navigate({ search: { q: wanted }, replace: true }),
      SEARCH_DELAY_MS,
    )
    return () => clearTimeout(timer)
  }, [text, q, navigate])

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <Typography variant="h3" component="h1">
          {t('clients.title')}
        </Typography>
        {/* Enabled with the create dialog (E8 F4). */}
        <Button variant="solid" colorScheme="black" disabled>
          {t('clients.add')}
        </Button>
      </div>
      <Input
        label={t('clients.search')}
        type="search"
        fullWidth
        maxLength={SEARCH_MAX_LENGTH}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <ClientsList q={q} />
    </main>
  )
}
