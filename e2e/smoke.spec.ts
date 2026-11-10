import { expect, test } from '@playwright/test'

// No back here (CI has none): pages that ask the API get a stubbed answer.
for (const path of ['/sign-in', '/sign-up', '/book/judo-kids']) {
  test(`${path} renders without page errors`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.route('**/api/me', (route) => route.fulfill({ status: 401 }))

    await page.goto(path, { waitUntil: 'networkidle' })

    expect(errors).toEqual([])
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
}

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
  await expect(page.getByRole('heading', { name: 'Judo Kids' })).toBeVisible()
})
