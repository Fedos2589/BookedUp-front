// @vitest-environment happy-dom
import { screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import { renderApp } from '@/test/renderApp'

test('renders the public booking page for a business', async () => {
  renderApp('/book/judo-kids')

  expect(
    await screen.findByRole('heading', { name: 'Booking: judo-kids' }),
  ).toBeTruthy()
})
