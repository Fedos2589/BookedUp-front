// Pulled into the Workbox-generated service worker (`importScripts` in
// vite.config.ts). Shows what the back pushes and opens its link on a tap.

self.addEventListener('push', (event) => {
  // A body that is not JSON (a test push from DevTools) still shows a title:
  // a push that shows nothing can get the subscription revoked.
  let message = {}
  try {
    message = event.data?.json() ?? {}
  } catch {
    message = {}
  }
  const { title, body, url } = message
  event.waitUntil(
    self.registration.showNotification(title ?? 'BookedUp', {
      body,
      data: { url: url ?? '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(
    event.notification.data?.url ?? '/',
    self.location.origin,
  ).href
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windows) => {
        const open = windows.find((client) => client.url === target)
        return open ? open.focus() : self.clients.openWindow(target)
      }),
  )
})
