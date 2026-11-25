import { expect, type Page, test } from '@playwright/test'

// A client's phone in English: book with «any», open the private link, move,
// cancel. The API is answered by the test (as calendar.spec.ts does).
test.use({
  locale: 'en-US',
  isMobile: true,
  hasTouch: true,
  viewport: { width: 390, height: 844 },
})

const ANNA = '00000000-0000-4000-8000-000000000021'
const BORIS = '00000000-0000-4000-8000-000000000022'
const TOKEN = 'secret-token'
const json = (body: unknown, status = 200) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
})

// Tomorrow on the business's clock (the strip of days starts from its today),
// at the given hour UTC: 09:00Z is 10:00 or 11:00 in Berlin, the same date.
// Tomorrow in UTC would be today in Berlin for an hour or two every evening.
const tomorrowAt = (hour: number) => {
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
  }).format(Date.now() + 86_400_000)
  return `${day}T${String(hour).padStart(2, '0')}:00:00.000Z`
}
const slot = (staffId: string, hour: number) => ({
  staffId,
  startsAt: tomorrowAt(hour),
  endsAt: tomorrowAt(hour + 1),
  title: null,
  description: null,
  capacity: 1,
  booked: 0,
  full: false,
  groupId: null,
  oneOffSessionId: null,
})

// The business of two masters with free times, and what the back says of the
// booking as it moves: one `current` that the move and the cancel change.
async function openBusiness(page: Page) {
  let current = { startsAt: tomorrowAt(9), status: 'BOOKED' }
  const requests: string[] = []

  await page.route('**/api/public/businesses/judo', (route) =>
    route.fulfill(
      json({
        name: 'Judo Kids',
        slug: 'judo',
        timeZone: 'Europe/Berlin',
        channels: {
          telegram: false,
          whatsapp: true,
          push: false,
          email: false,
        },
        pushKey: null,
        masters: [
          { id: ANNA, name: 'Anna', scheduleMode: 'HOURS' },
          { id: BORIS, name: 'Boris', scheduleMode: 'HOURS' },
        ],
      }),
    ),
  )
  // Signed in: the phone is the one confirmed in Telegram (the sign-in itself is T8).
  await page.route('**/api/public/client-session', (route) =>
    route.fulfill(json({ phone: '+4915112345678' })),
  )
  await page.route('**/api/public/businesses/judo/slots?*', (route) =>
    route.fulfill(json([slot(ANNA, 9), slot(ANNA, 11), slot(BORIS, 9)])),
  )
  await page.route('**/api/public/businesses/judo/bookings', (route) => {
    requests.push('book')
    return route.fulfill(
      json(
        {
          booking: {
            id: 'b1',
            staffId: ANNA,
            staffName: 'Anna',
            startsAt: current.startsAt,
            endsAt: tomorrowAt(10),
            title: null,
            groupId: null,
            oneOffSessionId: null,
          },
          phone: '+4915112345678',
          manageLink: `http://localhost:5180/book/judo/manage/${TOKEN}`,
        },
        201,
      ),
    )
  })
  await page.route(`**/api/public/bookings/${TOKEN}`, async (route) => {
    if (route.request().method() === 'PATCH') {
      const { startsAt } = route.request().postDataJSON()
      requests.push(`move to ${startsAt}`)
      current = { ...current, startsAt }
    }
    const end = new Date(Date.parse(current.startsAt) + 3_600_000)
    return route.fulfill(
      json({
        business: {
          name: 'Judo Kids',
          slug: 'judo',
          timeZone: 'Europe/Berlin',
        },
        booking: {
          staffId: ANNA,
          staffName: 'Anna',
          startsAt: current.startsAt,
          endsAt: end.toISOString(),
          title: null,
          status: current.status,
          groupId: null,
          oneOffSessionId: null,
        },
        canChange: current.status === 'BOOKED',
        notifications: {
          telegram: false,
          whatsapp: false,
          push: [],
          email: null,
        },
      }),
    )
  })
  await page.route(`**/api/public/bookings/${TOKEN}/cancel`, (route) => {
    requests.push('cancel')
    current = { ...current, status: 'CANCELLED' }
    return route.fulfill(json({}))
  })
  return requests
}

// Tomorrow is the second day of the strip; its times are the «Time» group.
const times = async (page: Page) => {
  await page
    .getByRole('radiogroup', { name: 'Day' })
    .getByRole('radio')
    .nth(1)
    .click()
  return page.getByRole('radiogroup', { name: 'Time' }).getByRole('radio')
}

const overflow = (page: Page) =>
  page.evaluate('document.documentElement.scrollWidth')

test('book with «any master», then move and cancel by the private link', async ({
  page,
}) => {
  const requests = await openBusiness(page)
  await page.goto('/book/judo')

  // Four screens: master → time → details → done.
  await page.getByRole('button', { name: 'Any free master' }).click()
  await (await times(page)).first().click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('Name').fill('Ira')
  await page.getByRole('button', { name: 'Book' }).click()
  await expect(
    page.getByRole('heading', { name: 'You are booked' }),
  ).toBeVisible()
  expect(await overflow(page)).toBe(390)

  // The link from the done screen opens the booking.
  const link = await page.getByLabel('Your booking link').inputValue()
  await page.goto(new URL(link).pathname)
  await expect(page.getByText('Booked', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Change time' }).click()
  await (await times(page)).first().click()
  await page.getByRole('button', { name: 'Move' }).click()
  await expect(page.getByRole('button', { name: 'Change time' })).toBeVisible()

  await page.getByRole('button', { name: 'Cancel booking' }).click()
  await page.getByRole('button', { name: 'Yes, cancel' }).click()
  await expect(page.getByText('Cancelled', { exact: true })).toBeVisible()
  // The move asked for the time the strip offered: Anna's 11:00Z (her 09:00Z
  // is the booking's own, not offered again).
  expect(requests).toEqual(['book', `move to ${tomorrowAt(11)}`, 'cancel'])
})

// iOS Safari lays the keyboard over the page: only the visual viewport
// shrinks. Chromium can't show a keyboard, so it is faked (as mobile.spec.ts).
test('on the details step the Book button stays above the keyboard', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 600 })
  await page.addInitScript(`(() => {
    const fake = Object.assign(new EventTarget(), {
      height: window.innerHeight,
      offsetTop: 0,
      scale: 1,
    })
    Object.defineProperty(window, 'visualViewport', { get: () => fake })
    window.__keyboard = fake
  })()`)
  await openBusiness(page)
  await page.goto('/book/judo')
  await page.getByRole('button', { name: 'Any free master' }).click()
  await (await times(page)).first().click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('Name').focus()

  await page.evaluate(`(() => {
    const fake = window.__keyboard
    fake.height = window.innerHeight - 300
    fake.dispatchEvent(new Event('resize'))
  })()`)

  await expect
    .poll(async () => {
      const box = await page.getByRole('button', { name: 'Book' }).boundingBox()
      return box!.y + box!.height
    })
    .toBeLessThanOrEqual(300)
})
