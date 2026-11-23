// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react'
import { beforeEach, expect, test } from 'vitest'

import { useBusinessManifest } from './useBusinessManifest'

const manifest = () =>
  document.head.querySelector<HTMLLinkElement>('link[rel="manifest"]')?.href
const appTitle = () =>
  document.head
    .querySelector('meta[name="apple-mobile-web-app-title"]')
    ?.getAttribute('content')

beforeEach(() => {
  document.head.innerHTML = `
    <link rel="manifest" href="/manifest.webmanifest">
    <meta name="apple-mobile-web-app-title" content="BookedUp">`
  document.title = 'BookedUp'
})

test('the page is the business’s app while it is open, the cabinet’s again after', () => {
  const page = renderHook(() => useBusinessManifest('judo', 'Judo Kids'))

  expect(manifest()).toContain(
    '/api/public/businesses/judo/manifest.webmanifest',
  )
  expect(appTitle()).toBe('Judo Kids')
  expect(document.title).toBe('Judo Kids')

  page.unmount()

  expect(manifest()).toContain('/manifest.webmanifest')
  expect(manifest()).not.toContain('judo')
  expect(appTitle()).toBe('BookedUp')
  expect(document.title).toBe('BookedUp')
})

test('until the name is known only the manifest is swapped', () => {
  const page = renderHook(
    ({ name }: { name?: string }) => useBusinessManifest('judo', name),
    { initialProps: {} },
  )
  expect(manifest()).toContain('judo')
  expect(document.title).toBe('BookedUp')

  page.rerender({ name: 'Judo Kids' })
  expect(document.title).toBe('Judo Kids')
})
