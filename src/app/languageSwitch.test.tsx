import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'

import i18n from '@/i18n'
import { account, deferredAnswer, fakeApi } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

afterEach(async () => {
  cleanup()
  await i18n.changeLanguage('en')
})

test('the header switches the language, tells the back and leads home', async () => {
  const api = fakeApi({ 'GET /api/me': [401], 'PUT /api/locale': [204] })
  renderApp('/sign-in')

  expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'BookedUp' })).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: 'Language: English' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Русский' }))

  expect(await screen.findByRole('heading', { name: 'Вход' })).toBeTruthy()
  expect(api.calls).toContainEqual({
    route: 'PUT /api/locale',
    body: { locale: 'ru' },
  })
  expect(document.documentElement.lang).toBe('ru')
})

test('the interface switches before the back answers, and returns if it refuses', async () => {
  const later = deferredAnswer()
  fakeApi({ 'GET /api/me': [401], 'PUT /api/locale': later.answer })
  renderApp('/sign-in')

  fireEvent.click(
    await screen.findByRole('button', { name: 'Language: English' }),
  )
  fireEvent.click(await screen.findByRole('button', { name: 'Русский' }))
  expect(await screen.findByRole('heading', { name: 'Вход' })).toBeTruthy()

  later.send([500])
  expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Language: English' })).toBeTruthy()
  expect(document.documentElement.lang).toBe('en')
})

test("a client's booking page has the language, but no way into the cabinet", async () => {
  fakeApi({})
  renderApp('/book/acme')

  expect(
    await screen.findByRole('button', { name: 'Language: English' }),
  ).toBeTruthy()
  expect(screen.queryByRole('link')).toBeNull()
})

test('the language of the account wins over the one the page started in', async () => {
  fakeApi({
    'GET /api/me': [
      200,
      { ...account, user: { ...account.user, locale: 'ru' } },
    ],
  })
  renderApp('/')

  expect(await screen.findByRole('button', { name: 'Выйти' })).toBeTruthy()
  expect(document.documentElement.lang).toBe('ru')
})

test('a cached answer of GET /me does not undo the language just chosen', async () => {
  fakeApi({ 'GET /api/me': [200, account], 'PUT /api/locale': [204] })
  const { router } = renderApp('/')

  fireEvent.click(
    await screen.findByRole('button', { name: 'Language: English' }),
  )
  fireEvent.click(await screen.findByRole('button', { name: 'Русский' }))
  expect(await screen.findByRole('button', { name: 'Выйти' })).toBeTruthy()

  await router.navigate({ to: '/settings' })
  expect(await screen.findByRole('button', { name: 'Выйти' })).toBeTruthy()
  expect(document.documentElement.lang).toBe('ru')
})
