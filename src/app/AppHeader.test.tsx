// @vitest-environment happy-dom
import { cleanup, screen, within } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'

import { account, fakeApi } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

afterEach(cleanup)

test('in the cabinet the one header holds the navigation, the language and sign out', async () => {
  fakeApi({ 'GET /api/me': [200, account] })
  renderApp('/')
  const header = await screen.findByRole('banner')

  expect(within(header).getByRole('navigation')).toBeTruthy()
  expect(within(header).getByRole('link', { name: 'Calendar' })).toBeTruthy()
  expect(within(header).getByRole('button', { name: 'Sign out' })).toBeTruthy()
  expect(screen.getAllByRole('button', { name: 'Sign out' })).toHaveLength(1)
})

test('the sign-in screen keeps the logo and the language only', async () => {
  fakeApi({ 'GET /api/me': [401] })
  renderApp('/sign-in')
  const header = await screen.findByRole('banner')

  expect(within(header).queryByRole('navigation')).toBeNull()
  expect(within(header).queryByRole('button', { name: 'Sign out' })).toBeNull()
})
