type UpdatePolicyDeps = {
  // Ask the browser whether a new service worker (a new app version) exists.
  checkForUpdate: () => void
  // Activate the waiting version and reload into it.
  applyUpdate: () => void
  hasUnsavedInput: () => boolean
}

// When an installed app looks for and switches to a new version. iOS and
// Android keep it suspended and bring it back without a reload, so the browser
// never checks on its own: check each time it comes back to the screen. Switch
// only while it is in the background — never in front of the user — and not
// while a form holds typed input (they may be in the mail app copying an
// address for it); then wait for a later trip to the background.
export function createUpdatePolicy({
  checkForUpdate,
  applyUpdate,
  hasUnsavedInput,
}: UpdatePolicyDeps) {
  let updateWaiting = false

  return {
    updateReady() {
      updateWaiting = true
    },
    visibilityChanged(state: DocumentVisibilityState) {
      if (state === 'visible') checkForUpdate()
      else if (updateWaiting && !hasUnsavedInput()) applyUpdate()
    },
  }
}
