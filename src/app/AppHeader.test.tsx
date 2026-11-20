// @vitest-environment happy-dom
import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'

import { account, fakeApi } from '@/test/fakeApi'
import { renderApp } from '@/test/renderApp'

afterEach(cleanup)

// happy-dom's window knows its size; the DOM typings do not know happy-dom.
const setViewport = (size: { width: number; height: number }) =>
  (
    window as unknown as {
      happyDOM: { setViewport: (size: object) => void }
    }
  ).happyDOM.setViewport(size)

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

test('on a phone the cabinet header is the logo and a burger that opens the menu', async () => {
  setViewport({ width: 390, height: 844 })
  try {
    fakeApi({ 'GET /api/me': [200, account] })
    renderApp('/')
    const header = await screen.findByRole('banner')

    expect(within(header).queryByRole('navigation')).toBeNull()
    expect(
      within(header).queryByRole('button', { name: 'Sign out' }),
    ).toBeNull()

    const burger = within(header).getByRole('button', { name: 'Menu' })
    fireEvent.click(burger)
    const menu = await screen.findByRole('dialog')
    expect(within(menu).getByRole('link', { name: 'Calendar' })).toBeTruthy()
    expect(within(menu).getByRole('button', { name: 'Sign out' })).toBeTruthy()
    expect(within(menu).getByRole('button', { name: /Language/ })).toBeTruthy()

    fireEvent.click(within(menu).getByRole('link', { name: 'Calendar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(burger)
  } finally {
    setViewport({ width: 1024, height: 768 })
  }
})
