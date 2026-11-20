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

// Today in Bangkok (UTC+7), where the business is.
const bangkokDay = () =>
  new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10)

// The cabinet of one business with one master, and one booking on a day at
// the hour `hourOn(day)` gives (Bangkok time). Opens the calendar on `day`.
async function openCalendar(
  page: Page,
  day: string,
  hourOn: (day: string) => number,
) {
  const bookingOn = (date: string) => {
    const hour = String(hourOn(date)).padStart(2, '0')
    return {
      id: '00000000-0000-4000-8000-000000000031',
      staffId,
      startsAt: `${date}T${hour}:00:00+07:00`,
      endsAt: `${date}T${hour}:45:00+07:00`,
      status: 'BOOKED',
      clientName: 'Olga',
      clientPhone: '+66000000',
      note: null,
      groupId: null,
      oneOffSessionId: null,
    }
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
  await page.route('**/api/businesses/*/appointments?*', (route) => {
    const from = new URL(route.request().url()).searchParams.get('from')!
    return route.fulfill(json([bookingOn(from)]))
  })
  await page.route('**/api/businesses/*/slots?*', (route) =>
    route.fulfill(json([])),
  )
  await page.goto(`/calendar?date=${day}`)
  await page.getByText('Olga').waitFor()
}

// Midnight of today in Bangkok has always started.
async function withStartedBooking(page: Page) {
  await openCalendar(page, bangkokDay(), () => 0)
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

  // The footer (below everything else): Close and the one main action; the
  // other moves sit in the body, above it.
  const done = dialog.getByRole('button', { name: 'Mark as done' })
  const close = dialog
    .getByRole('button', { name: 'Close', exact: true })
    .last()
  await expect(done).toBeVisible()
  const footerTop = (await done.boundingBox())!.y
  expect((await close.boundingBox())!.y).toBeGreaterThanOrEqual(footerTop - 1)
  for (const name of ['Move', 'Confirm', 'Mark as no-show', 'Cancel booking']) {
    const button = dialog.getByRole('button', { name, exact: true })
    await expect(button).toBeVisible()
    const box = (await button.boundingBox())!
    expect(box.y + box.height).toBeLessThanOrEqual(footerTop)
  }
})

// The calendar is one screen high: the page does not scroll, the day grid
// does (the header stays in view), and it opens on the first booking's hour.
test('the page is one screen high and only the day grid scrolls', async ({
  page,
}) => {
  await withStartedBooking(page)
  await page.keyboard.press('Escape')

  expect(await page.evaluate('document.documentElement.scrollHeight')).toBe(844)
  const grid = page.locator('[class*="gridBox"]')
  const scrolls = await grid.evaluate((el) => el.scrollHeight > el.clientHeight)
  expect(scrolls).toBe(true)
  // The booking is at 00:00: the grid opens at the top of the day.
  expect(await grid.evaluate((el) => el.scrollTop)).toBe(0)
})

// The grid opens on the first booking's hour, and a day opened again from the
// cache opens on its own bookings, not where the last day was scrolled to.
test('the day grid opens on the bookings of the day it shows', async ({
  page,
}) => {
  const today = bangkokDay()
  await openCalendar(page, today, (day) => (day === today ? 0 : 15))
  const grid = page.locator('[class*="gridBox"]')
  const hourAtTop = async (label: string) => {
    const box = (await grid.boundingBox())!
    const hour = (await grid.getByText(label, { exact: true }).boundingBox())!
    return hour.y >= box.y && hour.y < box.y + box.height / 3
  }

  await page.getByRole('button', { name: 'Next day' }).click()
  await grid.getByText('Olga').waitFor()
  expect(await hourAtTop('15:00')).toBe(true)

  await page.getByRole('button', { name: 'Previous day' }).click()
  await grid.getByText('Olga').waitFor()
  expect(await grid.evaluate((el) => el.scrollTop)).toBe(0)
})

// A short screen (a phone on its side) still shows a usable piece of the day:
// the page scrolls instead of squeezing the grid away.
test('on a short screen the day grid keeps its height', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 })
  await openCalendar(page, bangkokDay(), () => 0)

  const grid = page.locator('[class*="gridBox"]')
  expect((await grid.boundingBox())!.height).toBeGreaterThanOrEqual(240)
})
