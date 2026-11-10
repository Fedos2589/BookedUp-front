import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import '../i18n'
import { App } from './App'
import { router } from './router'

test('renders the public booking page for a business', async () => {
  await router.navigate({
    to: '/book/$businessSlug',
    params: { businessSlug: 'judo-kids' },
  })
  render(<App />)

  expect(
    await screen.findByRole('heading', { name: 'Booking: judo-kids' }),
  ).toBeTruthy()
})
