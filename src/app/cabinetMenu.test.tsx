// @vitest-environment happy-dom
import { cleanup, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'

import { account, fakeApi } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'
import { useCabinetMenu } from './cabinetMenu'

afterEach(cleanup)

test('the cabinet fills the header menu, the sign-in screen does not', async () => {
  fakeApi({ 'GET /api/me': [200, account] })
  renderApp('/')
  await screen.findByRole('navigation')
  expect(useCabinetMenu.getState().links?.map((link) => link.to)).toContain(
    '/calendar',
  )
  cleanup()

  fakeApi({ 'GET /api/me': [401] })
  renderApp('/sign-in')
  await screen.findByRole('heading', { name: 'Sign in' })
  expect(useCabinetMenu.getState().links).toBeNull()
})
