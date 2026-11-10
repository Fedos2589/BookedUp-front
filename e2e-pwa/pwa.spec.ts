import { expect, test } from '@playwright/test'

// Expressions run in the page as text: this folder has no DOM types.
const activeWorkerState = `(async () => {
  const worker = (await navigator.serviceWorker.ready).active
  if (worker.state !== 'activated')
    await new Promise((resolve) =>
      worker.addEventListener('statechange', () => worker.state === 'activated' && resolve()))
  return worker.state
})()`

test('the manifest makes it installable as a standalone app', async ({
  request,
}) => {
  const manifest = await (await request.get('/manifest.webmanifest')).json()

  expect(manifest).toMatchObject({
    name: 'BookedUp',
    display: 'standalone',
    start_url: '/',
  })
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ sizes: '192x192' }),
      expect.objectContaining({ sizes: '512x512' }),
      expect.objectContaining({ purpose: 'maskable' }),
    ]),
  )
  for (const icon of manifest.icons)
    expect((await request.get(`/${icon.src}`)).ok()).toBe(true)
})

test('once installed, the app opens offline', async ({ page, context }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('**/api/me', (route) => route.fulfill({ status: 401 }))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  expect(await page.evaluate(activeWorkerState)).toBe('activated')

  // Offline the shell comes from the precache. The installed app starts at
  // start_url `/`: the cabinet's session check cannot reach the API (a network
  // error, not a 401), so its error screen offers to try again.
  await page.unroute('**/api/me')
  await context.setOffline(true)
  await page.goto('/')
  await expect(
    page.getByRole('heading', { name: "Couldn't load your account" }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
  // Sign in tolerates a failed check: the form is still the page to show.
  await page.goto('/sign-in')
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  // A deep link falls back to the shell too.
  await page.goto('/book/judo-kids')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  expect(errors).toEqual([])
})

// The kit is measured in Montserrat; offline it must not fall back to a
// system font. This page load is the first one the service worker controls.
test('offline, the app still has its font', async ({ page, context }) => {
  await page.route('**/api/me', (route) => route.fulfill({ status: 401 }))
  await page.goto('/sign-in')
  expect(await page.evaluate(activeWorkerState)).toBe('activated')

  await page.unroute('**/api/me')
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()

  const montserratLoaded = `document.fonts.ready.then(() =>
    [...document.fonts].some((font) =>
      font.family.replaceAll('"', '') === 'Montserrat' && font.status === 'loaded'))`
  expect(await page.evaluate(montserratLoaded)).toBe(true)
})
