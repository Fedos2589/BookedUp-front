import { expect, type Locator, test } from '@playwright/test'

// In the installed iOS app a white 8px strip (.pwa-top-edge) covers the top of
// the screen: every page keeps its first line below it (AGENTS.md).
async function expectClearOfTopEdge(heading: Locator) {
  const box = await heading.boundingBox()
  expect(box!.y).toBeGreaterThanOrEqual(8)
}

// No back here (CI has none): pages that ask the API get a stubbed answer.
for (const path of ['/sign-in', '/sign-up']) {
  test(`${path} renders without page errors`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.route('**/api/me', (route) => route.fulfill({ status: 401 }))

    await page.goto(path, { waitUntil: 'networkidle' })

    expect(errors).toEqual([])
    const heading = page.getByRole('heading', { level: 1 })
    await expect(heading).toBeVisible()
    await expectClearOfTopEdge(heading)
  })
}

// The booking page asks the public API for the business and its free times.
test('/book/judo-kids renders without page errors', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('**/api/public/businesses/judo-kids', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        name: 'Judo Kids',
        slug: 'judo-kids',
        timeZone: 'Asia/Bangkok',
        clientSignIn: true,
        masters: [
          {
            id: '00000000-0000-4000-8000-000000000003',
            name: 'Anna',
            scheduleMode: 'HOURS',
          },
        ],
      }),
    }),
  )
  await page.route('**/api/public/businesses/judo-kids/slots*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    }),
  )

  await page.goto('/book/judo-kids', { waitUntil: 'networkidle' })

  expect(errors).toEqual([])
  const heading = page.getByRole('heading', { level: 1, name: 'Judo Kids' })
  await expect(heading).toBeVisible()
  await expect(page.getByRole('button', { name: /Anna/ })).toBeVisible()
  await expectClearOfTopEdge(heading)
})

test('a guest opening the cabinet lands on sign in', async ({ page }) => {
  await page.route('**/api/me', (route) => route.fulfill({ status: 401 }))

  await page.goto('/')

  await expect(page).toHaveURL(/\/sign-in$/)
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
})

// The cabinet renders its kit components in dev mode too (a missing
// optimizeDeps entry only shows there).
test('the cabinet renders for a signed-in owner without page errors', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('**/api/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: '00000000-0000-4000-8000-000000000001',
          email: 'anna@example.com',
          name: 'Anna',
        },
        businesses: [
          {
            id: '00000000-0000-4000-8000-000000000002',
            name: 'Judo Kids',
            slug: 'judo-kids',
            timeZone: 'Asia/Bangkok',
            role: 'OWNER',
          },
        ],
      }),
    }),
  )

  await page.goto('/', { waitUntil: 'networkidle' })

  expect(errors).toEqual([])
  const heading = page.getByRole('heading', { name: 'Judo Kids' })
  await expect(heading).toBeVisible()
  await expectClearOfTopEdge(heading)
})

test('the cabinet’s error screen, when the session check fails', async ({
  page,
}) => {
  await page.route('**/api/me', (route) => route.fulfill({ status: 502 }))

  await page.goto('/')

  const heading = page.getByRole('heading', {
    name: "Couldn't load your account",
  })
  await expect(heading).toBeVisible()
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
  await expectClearOfTopEdge(heading)
})

test('the business settings render for a signed-in owner', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const business = {
    id: '00000000-0000-4000-8000-000000000002',
    name: 'Judo Kids',
    slug: 'judo-kids',
    timeZone: 'Asia/Bangkok',
    role: 'OWNER',
    reminderOffsets: [1440],
  }
  await page.route('**/api/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: '00000000-0000-4000-8000-000000000001',
          email: 'anna@example.com',
          name: 'Anna',
        },
        businesses: [business],
      }),
    }),
  )
  await page.route(`**/api/businesses/${business.id}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(business),
    }),
  )
  await page.setViewportSize({ width: 390, height: 844 })

  await page.goto('/settings', { waitUntil: 'networkidle' })

  expect(errors).toEqual([])
  const heading = page.getByRole('heading', { name: 'Business settings' })
  await expect(heading).toBeVisible()
  await expect(page.getByText('Asia/Bangkok')).toBeVisible()
  await expectClearOfTopEdge(heading)
  expect(await page.evaluate('document.documentElement.scrollWidth')).toBe(390)
})

// An account removed from its last business: no navigation, but sign out
// is still there — on a phone in the burger's sheet; the header stays one row.
test('the «no business» screen keeps sign out in the burger', async ({
  page,
}) => {
  await page.route('**/api/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          id: '00000000-0000-4000-8000-000000000001',
          email: 'anna@example.com',
          name: 'Anna',
        },
        businesses: [],
      }),
    }),
  )
  // The language choice goes to the back; there is none here, and a refusal
  // would take the interface back to English.
  await page.route('**/api/locale', (route) => route.fulfill({ status: 204 }))
  await page.setViewportSize({ width: 390, height: 844 })

  await page.goto('/', { waitUntil: 'networkidle' })

  const heading = page.getByRole('heading', {
    name: 'You’re not in a business',
  })
  await expect(heading).toBeVisible()
  await expectClearOfTopEdge(heading)
  const header = page.getByRole('banner')
  expect((await header.boundingBox())!.height).toBeLessThan(80)
  expect(await page.evaluate('document.documentElement.scrollWidth')).toBe(390)
  // The burger at the right edge, past the cabinet's 16px side padding.
  const burger = header.getByRole('button', { name: 'Menu' })
  const box = (await burger.boundingBox())!
  expect(Math.round(box.x + box.width)).toBe(390 - 16)
  await burger.click()
  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Sign out' }),
  ).toBeVisible()
  // The language dropdown opens over the sheet and can be used.
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Language/ })
    .click()
  await page.getByRole('button', { name: 'Русский' }).click()
  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Выйти' }),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Меню' })).toBeHidden()
  await expect(header.getByRole('button', { name: 'Меню' })).toBeFocused()
})
