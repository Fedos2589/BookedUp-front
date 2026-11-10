import { registerSW } from 'virtual:pwa-register'

import { hasUnsavedInput } from './unsavedInput'
import { createUpdatePolicy } from './updatePolicy'

// Registers the service worker (vite-plugin-pwa) and runs the update policy
// on visibility changes. In dev the plugin serves no worker; this is a no-op.
export function registerAppUpdates() {
  let registration: ServiceWorkerRegistration | undefined

  const updateSW = registerSW({
    onRegisteredSW(_url, swRegistration) {
      registration = swRegistration
    },
    onNeedRefresh() {
      policy.updateReady()
    },
  })

  const policy = createUpdatePolicy({
    checkForUpdate: () => void registration?.update(),
    applyUpdate: () => void updateSW(true),
    hasUnsavedInput,
  })

  document.addEventListener('visibilitychange', () =>
    policy.visibilityChanged(document.visibilityState),
  )
}
