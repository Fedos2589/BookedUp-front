import { useState } from 'react'

import { useSessionControllerSignOut } from '@/api/auth/auth'
import { turnThisDevicePushOff } from '@/pwa/turnThisDevicePushOff'

type Options = Parameters<typeof useSessionControllerSignOut>[0]

// Every «Sign out» button: this device's push goes off first, then the
// session ends. `isPending` covers both steps, so a second click is ignored.
export function useSignOut(mutation: NonNullable<Options>['mutation'] = {}) {
  const [leaving, setLeaving] = useState(false)
  const signOut = useSessionControllerSignOut({
    mutation: { ...mutation, onSettled: () => setLeaving(false) },
  })
  const leave = async () => {
    if (leaving || signOut.isPending) return
    setLeaving(true)
    await turnThisDevicePushOff()
    signOut.mutate()
  }
  return {
    leave: () => void leave(),
    isPending: leaving || signOut.isPending,
    isError: signOut.isError,
  }
}
