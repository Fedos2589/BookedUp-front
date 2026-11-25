// Until E7b the booking page kept the client's latest booking in the browser
// under `booking:<slug>`, with the secret manage link. Nothing reads it now:
// forget it, so that link doesn't lie around on a shared phone. Delete this
// once those browsers have had time to open the app (a few months).
export function forgetSavedBookings() {
  try {
    const keys = Object.keys(localStorage).filter((key) =>
      key.startsWith('booking:'),
    )
    for (const key of keys) localStorage.removeItem(key)
  } catch {
    // Blocked storage: nothing was saved there either.
  }
}
