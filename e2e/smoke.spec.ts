import { expect, test } from '@playwright/test'

for (const path of ['/', '/book/judo-kids']) {
  test(`${path} renders without page errors`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))

    await page.goto(path, { waitUntil: 'networkidle' })

    expect(errors).toEqual([])
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
}
