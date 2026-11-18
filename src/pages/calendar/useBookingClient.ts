import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { useCurrentBusiness } from '@/business/currentBusiness'
import { reloadClients } from '@/pages/clients/reloadClients'
import { useUnsavedInput } from '@/pwa/unsavedInput'
import { conflictCode } from './newBooking'
import type { PickerValue } from './pickerValue'

// The client of a booking: what the picker made, and the booking's note. The
// body's part for the back is undefined while the picker is incomplete.
// `reset` empties both (the picker remounts under a new `key`).
export function useBookingClient() {
  const [client, setClient] = useState<PickerValue>()
  const [note, setNote] = useState('')
  const [round, setRound] = useState(0)
  const queryClient = useQueryClient()
  const business = useCurrentBusiness()
  useUnsavedInput(note !== '')

  const trimmed = note.trim()
  return {
    client: client && { ...client, ...(trimmed && { note: trimmed }) },
    note,
    setNote,
    setClient,
    pickerKey: round,
    // A number that became someone's meanwhile: look it up again, so the picker
    // offers that account instead of refusing the same phone over and over.
    onRefused: (error: unknown) => {
      if (conflictCode(error) === 'phoneTaken')
        void reloadClients(queryClient, business.id)
    },
    reset: () => {
      setNote('')
      setRound((n) => n + 1)
    },
  }
}
