import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'

import i18n from '@/i18n'
import { meQueryKey } from '@/auth/session'
import { account, deferredAnswer, fakeApi } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

// happy-dom's window knows its size; the DOM typings do not know happy-dom.
const setViewport = (size: { width: number; height: number }) =>
  (
    window as unknown as {
      happyDOM: { setViewport: (size: object) => void }
    }
  ).happyDOM.setViewport(size)

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

test('the interface returns when the back refuses, though the menu with the dropdown is already closed', async () => {
  const later = deferredAnswer()
  fakeApi({ 'GET /api/me': [200, account], 'PUT /api/locale': later.answer })
  setViewport({ width: 390, height: 844 })
  try {
    renderApp('/')
    fireEvent.click(await screen.findByRole('button', { name: 'Menu' }))
    const menu = await screen.findByRole('dialog')
    fireEvent.click(within(menu).getByRole('button', { name: /Language/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Русский' }))
    await waitFor(() => expect(document.documentElement.lang).toBe('ru'))

    // A link closes the menu, and the language select with it.
    fireEvent.click(within(menu).getByRole('link', { name: /Календарь/ }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    later.send([500])
    await waitFor(() => expect(document.documentElement.lang).toBe('en'))
  } finally {
    setViewport({ width: 1024, height: 768 })
  }
})

test('a GET /me that answers while the choice is on its way does not undo it', async () => {
  const later = deferredAnswer()
  fakeApi({ 'GET /api/me': [200, account], 'PUT /api/locale': later.answer })
  const { queryClient } = renderApp('/')

  fireEvent.click(
    await screen.findByRole('button', { name: 'Language: English' }),
  )
  fireEvent.click(await screen.findByRole('button', { name: 'Русский' }))
  expect(await screen.findByRole('button', { name: 'Выйти' })).toBeTruthy()

  await queryClient.refetchQueries({ queryKey: meQueryKey() })
  expect(document.documentElement.lang).toBe('ru')
  later.send([204])
})
