import { expect, type Page, test } from '@playwright/test'

// A phone in Russian: the browser's language is picked, nothing overflows
// sideways, and the form's main action stays on screen (ted-ui usage.md).
test.use({
  locale: 'ru-RU',
  isMobile: true,
  hasTouch: true,
  viewport: { width: 390, height: 844 },
})

const asGuest = (page: Page) =>
  page.route('**/api/me', (route) => route.fulfill({ status: 401 }))

async function toBusinessStep(page: Page) {
  await page.getByLabel('Ваше имя').fill('Анна')
  await page.getByLabel('Email').fill('anna@example.com')
  await page.getByLabel('Пароль', { exact: true }).fill('long enough')
  await page.getByLabel('Пароль', { exact: true }).press('Enter')
  await expect(page.getByRole('heading', { name: 'Ваш бизнес' })).toBeVisible()
}

test('sign up speaks the browser’s Russian and fits 390px', async ({
  page,
}) => {
  await asGuest(page)
  await page.goto('/sign-up')

  await expect(
    page.getByRole('heading', { name: 'Создайте аккаунт' }),
  ).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru')
  await toBusinessStep(page)
  await page.getByLabel('Название бизнеса').fill('Студия красоты Анны')
  // e2e has no DOM types: the page evaluates the expression as text.
  expect(await page.evaluate('document.documentElement.scrollWidth')).toBe(390)
})

test('on a short screen the main action is pinned to the bottom', async ({
  page,
}) => {
  // Short enough that "Create account" would sit below the fold unpinned.
  await page.setViewportSize({ width: 390, height: 420 })
  await asGuest(page)
  await page.goto('/sign-up')
  await toBusinessStep(page)
  await page.evaluate('window.scrollTo(0, 0)')

  const submit = await page
    .getByRole('button', { name: 'Создать аккаунт' })
    .boundingBox()
  expect(submit!.y + submit!.height).toBeLessThanOrEqual(420)
})

// iOS Safari lays the keyboard over the page: only the visual viewport
// shrinks. Chromium can't show a keyboard, so the visual viewport is faked.
test('with the keyboard open the main action sits above it', async ({
  page,
}) => {
  // Short enough that the unlifted button would sit under the keys.
  await page.setViewportSize({ width: 390, height: 600 })
  // A string: e2e has no DOM types.
  await page.addInitScript(`(() => {
    const fake = Object.assign(new EventTarget(), {
      height: window.innerHeight,
      offsetTop: 0,
      scale: 1,
    })
    Object.defineProperty(window, 'visualViewport', { get: () => fake })
    window.__keyboard = fake
  })()`)
  await asGuest(page)
  await page.goto('/sign-up')
  await page.getByLabel('Ваше имя').focus()

  await page.evaluate(`(() => {
    const fake = window.__keyboard
    fake.height = window.innerHeight - 300
    fake.dispatchEvent(new Event('resize'))
  })()`)

  const keyboardTop = 600 - 300
  await expect
    .poll(async () => {
      const box = await page
        .getByRole('button', { name: 'Продолжить' })
        .boundingBox()
      return box!.y + box!.height
    })
    .toBeLessThanOrEqual(keyboardTop)
})
