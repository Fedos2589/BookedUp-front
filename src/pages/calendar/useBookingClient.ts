import { useState } from 'react'

import { useUnsavedInput } from '@/pwa/unsavedInput'
import type { PickerValue } from './pickerValue'

// The client of a booking: what the picker made, and the booking's note. The
// body's part for the back is undefined while the picker is incomplete.
// `reset` empties both (the picker remounts under a new `key`).
export function useBookingClient() {
  const [client, setClient] = useState<PickerValue>()
  const [note, setNote] = useState('')
  const [round, setRound] = useState(0)
  useUnsavedInput(note !== '')

  const trimmed = note.trim()
  return {
    client: client && { ...client, ...(trimmed && { note: trimmed }) },
    note,
    setNote,
    setClient,
    pickerKey: round,
    reset: () => {
      setNote('')
      setRound((n) => n + 1)
    },
  }
}
