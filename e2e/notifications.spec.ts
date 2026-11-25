import { expect, type Page, test } from '@playwright/test'

// Reminders, end to end in the browser: a client turns email on at the done
// screen; an owner sets the reminder times and turns their own email off.
// The API is answered by the test (CI has no back), as book.spec.ts does.
test.use({
  locale: 'en-US',
  isMobile: true,
  hasTouch: true,
  viewport: { width: 390, height: 844 },
})

const ANNA = '00000000-0000-4000-8000-000000000021'
const BUSINESS = '00000000-0000-4000-8000-000000000002'
const TOKEN = 'secret-token'
const json = (body: unknown, status = 200) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
})

const tomorrowAt = (hour: number) => {
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
  }).format(Date.now() + 86_400_000)
  return `${day}T${String(hour).padStart(2, '0')}:00:00.000Z`
}

// The business with one master and one free time; only email is on. The
// booking answers with the address once PUT …/email has been sent.
async function openBusiness(page: Page) {
  let email: string | null = null
  const requests: string[] = []

  await page.route('**/api/public/businesses/judo', (route) =>
    route.fulfill(
      json({
        name: 'Judo Kids',
        slug: 'judo',
        timeZone: 'Europe/Berlin',
        channels: {
          telegram: false,
          whatsapp: false,
          push: false,
          email: true,
        },
        pushKey: null,
        masters: [{ id: ANNA, name: 'Anna', scheduleMode: 'HOURS' }],
      }),
    ),
  )
  // Signed in: the phone is the one confirmed in Telegram (the sign-in itself is T8).
  await page.route('**/api/public/client-session', (route) =>
    route.fulfill(json({ phone: '+4915112345678' })),
  )
  await page.route('**/api/public/businesses/judo/slots?*', (route) =>
    route.fulfill(
      json([
        {
          staffId: ANNA,
          startsAt: tomorrowAt(9),
          endsAt: tomorrowAt(10),
          title: null,
          description: null,
          capacity: 1,
          booked: 0,
          full: false,
          groupId: null,
          oneOffSessionId: null,
        },
      ]),
    ),
  )
  await page.route('**/api/public/businesses/judo/bookings', (route) =>
    route.fulfill(
      json(
        {
          booking: {
            id: 'b1',
            staffId: ANNA,
            staffName: 'Anna',
            startsAt: tomorrowAt(9),
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
    ),
  )
  await page.route(`**/api/public/bookings/${TOKEN}`, (route) =>
    route.fulfill(
      json({
        business: {
          name: 'Judo Kids',
          slug: 'judo',
          timeZone: 'Europe/Berlin',
        },
        booking: {
          staffId: ANNA,
          staffName: 'Anna',
          startsAt: tomorrowAt(9),
          endsAt: tomorrowAt(10),
          title: null,
          status: 'BOOKED',
          groupId: null,
          oneOffSessionId: null,
        },
        canChange: true,
        notifications: { telegram: false, whatsapp: false, push: [], email },
      }),
    ),
  )
  await page.route(`**/api/public/bookings/${TOKEN}/email`, (route) => {
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON()
      requests.push(`email on ${body.email}`)
      email = 'i***@example.com'
    } else {
      requests.push('email off')
      email = null
    }
    return route.fulfill({ status: 204 })
  })
  return requests
}

test('a client turns email reminders on at the done screen', async ({
  page,
}) => {
  const requests = await openBusiness(page)
  await page.goto('/book/judo')

  await page.getByRole('button', { name: 'Any free master' }).click()
  await page
    .getByRole('radiogroup', { name: 'Day' })
    .getByRole('radio')
    .nth(1)
    .click()
  await page
    .getByRole('radiogroup', { name: 'Time' })
    .getByRole('radio')
    .first()
    .click()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('Name').fill('Ira')
  await page.getByRole('button', { name: 'Book' }).click()
  await expect(
    page.getByRole('heading', { name: 'You are booked' }),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Email' }).click()
  await page.getByLabel('Email').fill('ira@example.com')
  await page.getByRole('button', { name: 'Save' }).click()

  await expect(page.getByText('Email i***@example.com')).toBeVisible()
  await expect(page.getByText('On', { exact: true })).toBeVisible()
  expect(requests).toEqual(['email on ira@example.com'])
})

// The owner's cabinet: reminder times in Settings, own email in Notifications.
test('an owner sets the reminder times and turns their email off', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const requests: string[] = []
  let offsets = [1440]
  let email = true

  await page.route('**/api/me', (route) =>
    route.fulfill(
      json({
        user: { id: '1', email: 'anna@example.com', name: 'Anna' },
        businesses: [
          {
            id: BUSINESS,
            name: 'Judo Kids',
            slug: 'judo-kids',
            timeZone: 'Asia/Bangkok',
            role: 'OWNER',
            reminderOffsets: offsets,
          },
        ],
      }),
    ),
  )
  await page.route(`**/api/businesses/${BUSINESS}`, (route) =>
    route.fulfill(
      json({
        id: BUSINESS,
        name: 'Judo Kids',
        slug: 'judo-kids',
        timeZone: 'Asia/Bangkok',
        role: 'OWNER',
        reminderOffsets: offsets,
      }),
    ),
  )
  await page.route(`**/api/businesses/${BUSINESS}/reminders`, (route) => {
    offsets = route.request().postDataJSON().offsets
    requests.push(`reminders ${offsets.join(',')}`)
    return route.fulfill(json({ reminderOffsets: offsets }))
  })
  await page.route('**/api/me/notifications', (route) => {
    if (route.request().method() === 'PUT') {
      email = route.request().postDataJSON().email
      requests.push(`my email ${email}`)
      return route.fulfill({ status: 204 })
    }
    return route.fulfill(
      json({
        available: { telegram: false, push: false, email: true },
        pushKey: null,
        email,
        telegram: false,
        push: [],
      }),
    )
  })
  await page.route(`**/api/businesses/${BUSINESS}/me/notifications`, (route) =>
    route.fulfill(json({ allOnline: false })),
  )

  await page.goto('/settings')
  await expect(
    page.getByRole('heading', { name: 'Reminders to clients' }),
  ).toBeVisible()
  await page.getByRole('checkbox', { name: '2 hours before' }).click()
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Saved', { exact: true })).toBeVisible()

  await page.goto('/notifications')
  const mine = page.getByRole('checkbox', { name: 'Email' })
  await expect(mine).toBeChecked()
  await mine.click()
  await expect(mine).not.toBeChecked()

  expect(requests).toEqual(['reminders 120,1440', 'my email false'])
  expect(errors).toEqual([])
})
