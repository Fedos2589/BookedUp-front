import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'

import i18n from '@/i18n'
import { fakeApi } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

afterEach(async () => {
  cleanup()
  localStorage.clear()
  await i18n.changeLanguage('en')
})

test('the header switches the language, keeps the choice and leads home', async () => {
  fakeApi({ 'GET /api/me': [401] })
  renderApp('/sign-in')

  expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'BookedUp' })).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: 'Language: English' }))
  fireEvent.click(await screen.findByRole('button', { name: 'Русский' }))

  expect(await screen.findByRole('heading', { name: 'Вход' })).toBeTruthy()
  expect(localStorage.getItem('language')).toBe('ru')
  expect(document.documentElement.lang).toBe('ru')
})

test("a client's booking page has the language, but no way into the cabinet", async () => {
  fakeApi({})
  renderApp('/book/acme')

  expect(
    await screen.findByRole('button', { name: 'Language: English' }),
  ).toBeTruthy()
  expect(screen.queryByRole('link')).toBeNull()
})
