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
