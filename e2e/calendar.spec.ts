import { expect, type Page, test } from '@playwright/test'

// A phone in English, touch: the booking dialog of a started booking has the
// most moves; its footer must fit the screen and nothing may overflow sideways.
test.use({
  locale: 'en-US',
  isMobile: true,
  hasTouch: true,
  viewport: { width: 390, height: 844 },
})

const businessId = '00000000-0000-4000-8000-000000000002'
const staffId = '00000000-0000-4000-8000-000000000021'
const json = (body: unknown) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(body),
})

async function withStartedBooking(page: Page) {
  // Midnight of today in Bangkok (UTC+7) has always started.
  const today = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10)
  const booking = {
    id: '00000000-0000-4000-8000-000000000031',
    staffId,
    startsAt: `${today}T00:00:00+07:00`,
    endsAt: `${today}T00:45:00+07:00`,
    status: 'BOOKED',
    clientName: 'Olga',
    clientPhone: '+66000000',
    note: null,
    groupId: null,
    oneOffSessionId: null,
  }
  await page.route('**/api/me', (route) =>
    route.fulfill(
      json({
        user: { id: '1', email: 'anna@example.com', name: 'Anna' },
        businesses: [
          {
            id: businessId,
            name: 'Judo Kids',
            slug: 'judo-kids',
            timeZone: 'Asia/Bangkok',
            role: 'OWNER',
          },
        ],
      }),
    ),
  )
  await page.route('**/api/businesses/*/staff', (route) =>
    route.fulfill(
      json([
        {
          id: staffId,
          name: 'Vera',
          userId: null,
          archived: false,
          scheduleMode: 'HOURS',
        },
      ]),
    ),
  )
  await page.route('**/api/businesses/*/appointments?*', (route) =>
    route.fulfill(json([booking])),
  )
  await page.route('**/api/businesses/*/slots?*', (route) =>
    route.fulfill(json([])),
  )
  await page.goto(`/calendar?date=${today}`)
  await page.getByText('Olga').click()
}

test('a started booking’s dialog fits a phone: one main action in the footer', async ({
  page,
}) => {
  await withStartedBooking(page)

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  // e2e has no DOM types: the page evaluates the expression as text.
  expect(await page.evaluate('document.documentElement.scrollWidth')).toBe(390)
  const box = (await dialog.boundingBox())!
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(390)
  expect(box.y + box.height).toBeLessThanOrEqual(844)

  // The footer: Close and the one main action; the rest sits in the body.
  const footer = dialog.locator('[class*="footer"]')
  await expect(footer.getByRole('button')).toHaveCount(2)
  await expect(
    footer.getByRole('button', { name: 'Mark as done' }),
  ).toBeVisible()
  for (const name of ['Move', 'Confirm', 'Mark as no-show', 'Cancel booking']) {
    const button = dialog.getByRole('button', { name, exact: true })
    await expect(button).toBeVisible()
    await expect(footer.getByRole('button', { name, exact: true })).toHaveCount(
      0,
    )
  }
})
