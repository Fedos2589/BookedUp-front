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

  // Offline the shell comes from the precache; the session check cannot reach
  // the API, so sign in is the page to show. A deep link falls back too.
  await page.unroute('**/api/me')
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  await page.goto('/book/judo-kids')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  expect(errors).toEqual([])
})
