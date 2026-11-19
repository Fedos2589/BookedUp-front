import { fireEvent, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'

import i18n from '@/i18n'
import { fakeApi } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

afterEach(async () => {
  localStorage.clear()
  await i18n.changeLanguage('en')
})

test('the header switches the language, keeps the choice and offers home', async () => {
  fakeApi({ 'GET /api/me': [401] })
  renderApp('/sign-in')

  expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Home' })).toBeTruthy()

  fireEvent.click(screen.getByRole('combobox', { name: 'Language' }))
  fireEvent.click(await screen.findByRole('option', { name: 'Русский' }))

  expect(await screen.findByRole('heading', { name: 'Вход' })).toBeTruthy()
  expect(localStorage.getItem('language')).toBe('ru')
  expect(document.documentElement.lang).toBe('ru')
})
