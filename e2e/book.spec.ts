import { expect, type Page, test } from '@playwright/test'

// A client's phone in English: confirm the phone in Telegram and book, move and
// cancel by the private link, move one of «My bookings». The API is answered by
// the test (as calendar.spec.ts does).
test.use({
  locale: 'en-US',
  isMobile: true,
  hasTouch: true,
  viewport: { width: 390, height: 844 },
})

const ANNA = '00000000-0000-4000-8000-000000000021'
const BORIS = '00000000-0000-4000-8000-000000000022'
const TOKEN = 'secret-token'
const PHONE = '+4915112345678'
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

// One of the signed-in client's bookings, as `my-bookings` lists it.
const mine = (startsAt: string) => ({
  id: 'b1',
  clientName: 'Ira',
  staffId: ANNA,
  staffName: 'Anna',
  startsAt,
  endsAt: new Date(Date.parse(startsAt) + 3_600_000).toISOString(),
  title: null,
  status: 'BOOKED',
  groupId: null,
  oneOffSessionId: null,
  canChange: true,
})

// The business of two masters with free times, and what the back says of the
// booking as it moves: one `current` that the move and the cancel change.
// `back.phone` is the client's session (null: not signed in; the bot's
// `confirmed` signs in), `back.mine` their bookings to come.
async function openBusiness(page: Page) {
  let current = { startsAt: tomorrowAt(9), status: 'BOOKED' }
  const requests: string[] = []
  const back = {
    requests,
    phone: PHONE as string | null,
    mine: [] as ReturnType<typeof mine>[],
    bookBody: undefined as unknown,
  }

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
        clientSignIn: true,
        masters: [
          { id: ANNA, name: 'Anna', scheduleMode: 'HOURS' },
          { id: BORIS, name: 'Boris', scheduleMode: 'HOURS' },
        ],
      }),
    ),
  )
  await page.route('**/api/public/client-session', (route) =>
    route.fulfill(json({ phone: back.phone })),
  )
  // The bot answers on the second poll: pending, then confirmed.
  let polls = 0
  await page.route('**/api/public/client-login', (route) => {
    if (route.request().method() === 'POST') {
      requests.push('sign in')
      return route.fulfill(json({ url: 'https://t.me/bot?start=abc' }, 201))
    }
    polls += 1
    if (polls < 2) return route.fulfill(json({ status: 'pending' }))
    back.phone = PHONE
    return route.fulfill(json({ status: 'confirmed' }))
  })
  await page.route('**/api/public/businesses/judo/my-bookings', (route) =>
    route.fulfill(json({ bookings: back.mine })),
  )
  await page.route('**/api/public/businesses/judo/my-bookings/b1', (route) => {
    const { startsAt } = route.request().postDataJSON()
    requests.push(`move mine to ${startsAt}`)
    back.mine = [mine(startsAt)]
    return route.fulfill(json(back.mine[0]))
  })
  await page.route('**/api/public/businesses/judo/slots?*', (route) =>
    route.fulfill(json([slot(ANNA, 9), slot(ANNA, 11), slot(BORIS, 9)])),
  )
  await page.route('**/api/public/businesses/judo/bookings', (route) => {
    requests.push('book')
    back.bookBody = route.request().postDataJSON()
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
          phone: PHONE,
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
  return back
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
  const { requests } = await openBusiness(page)
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

test('confirm the phone in Telegram, then book: the done screen says which phone', async ({
  page,
}) => {
  const back = await openBusiness(page)
  back.phone = null
  await page.goto('/book/judo')

  await page.getByRole('button', { name: 'Any free master' }).click()
  await (await times(page)).first().click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('Name').fill('Ira')
  await page.getByRole('button', { name: 'Confirm phone in Telegram' }).click()

  // The link to the bot, then (the poll says confirmed) the phone and «Book».
  await expect(
    page.getByRole('link', { name: 'Open Telegram' }),
  ).toHaveAttribute('href', 'https://t.me/bot?start=abc')
  await page.getByRole('button', { name: 'Book' }).click()
  await expect(
    page.getByRole('heading', { name: 'You are booked' }),
  ).toBeVisible()
  await expect(page.getByText(/Booked on \+49/)).toBeVisible()
  expect(back.requests).toEqual(['sign in', 'book'])
  // The phone is the session's: never in the booking's body.
  expect(back.bookBody).not.toHaveProperty('phone')
})

test('signed in: step 1 lists my bookings, and my booking moves', async ({
  page,
}) => {
  const back = await openBusiness(page)
  back.mine = [mine(tomorrowAt(9))]
  await page.goto('/book/judo')

  const list = page.getByRole('region', { name: 'My bookings' })
  await list.getByRole('link', { name: /Anna/ }).click()
  await expect(page.getByText('Booked', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Change time' }).click()
  await (await times(page)).first().click()
  await page.getByRole('button', { name: 'Move' }).click()
  await expect(page.getByRole('button', { name: 'Change time' })).toBeVisible()
  expect(back.requests).toEqual([`move mine to ${tomorrowAt(11)}`])
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
