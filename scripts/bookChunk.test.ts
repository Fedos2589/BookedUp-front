// @vitest-environment node
import { expect, test } from 'vitest'

import { bookChunkFiles, foreignPages, type Manifest } from './bookChunk.ts'

// A build's manifest in miniature: the entry loads the router and the booking
// page's chunk; the cabinet's pages are chunks of their own.
const manifest: Manifest = {
  'index.html': {
    file: 'assets/index.js',
    isEntry: true,
    imports: ['_vendor.js'],
    dynamicImports: [
      'src/pages/book/BookingPage.tsx',
      'src/pages/calendar/CalendarPage.tsx',
    ],
  },
  '_vendor.js': { file: 'assets/vendor.js' },
  'src/pages/book/BookingPage.tsx': {
    file: 'assets/BookingPage.js',
    src: 'src/pages/book/BookingPage.tsx',
    isDynamicEntry: true,
    imports: ['_vendor.js'],
  },
  'src/pages/calendar/CalendarPage.tsx': {
    file: 'assets/CalendarPage.js',
    src: 'src/pages/calendar/CalendarPage.tsx',
    isDynamicEntry: true,
    imports: ['_vendor.js'],
  },
}

test('the booking page loads the entry, the shared chunks and its own chunk, not the cabinet', () => {
  expect(bookChunkFiles(manifest).sort()).toEqual([
    'assets/BookingPage.js',
    'assets/index.js',
    'assets/vendor.js',
  ])
  expect(foreignPages(manifest)).toEqual([])
})

test('a cabinet page imported by the booking page is named', () => {
  const leaking: Manifest = {
    ...manifest,
    'src/pages/book/BookingPage.tsx': {
      ...manifest['src/pages/book/BookingPage.tsx'],
      imports: ['_vendor.js', 'src/pages/calendar/CalendarPage.tsx'],
    },
  }
  expect(foreignPages(leaking)).toEqual(['src/pages/calendar/CalendarPage.tsx'])
})

test('the entry importing a cabinet page statically is named too', () => {
  const leaking: Manifest = {
    ...manifest,
    'index.html': {
      ...manifest['index.html'],
      imports: ['_vendor.js', 'src/pages/calendar/CalendarPage.tsx'],
    },
  }
  expect(foreignPages(leaking)).toEqual(['src/pages/calendar/CalendarPage.tsx'])
})

test('a build without the booking page fails loudly, not as a pass', () => {
  const { 'src/pages/book/BookingPage.tsx': _gone, ...rest } = manifest
  expect(() => bookChunkFiles(rest)).toThrow(/BookingPage/)
})
