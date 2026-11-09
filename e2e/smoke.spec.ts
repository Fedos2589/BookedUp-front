import { expect, test } from '@playwright/test'

test('opens the business cabinet', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'BookedUp' })).toBeVisible()
})
