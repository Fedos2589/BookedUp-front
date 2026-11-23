// @vitest-environment node
import { expect, test } from 'vitest'

import {
  bookChunkFiles,
  foreignPages,
  type Chunk,
  type Chunks,
} from './bookChunk.ts'

const chunk = (over: Partial<Chunk>): Chunk => ({
  isEntry: false,
  imports: [],
  css: [],
  modules: [],
  ...over,
})

// A build's chunk map in miniature: the entry loads the router and a shared
// chunk; the booking page and the calendar are chunks of their own.
const chunks: Chunks = {
  'assets/index.js': chunk({
    isEntry: true,
    imports: ['assets/shared.js'],
    css: ['assets/index.css'],
    modules: ['src/app/router.tsx', 'src/pages/PagePending.tsx'],
  }),
  'assets/shared.js': chunk({ modules: ['src/dates.ts'] }),
  'assets/BookingPage.js': chunk({
    facade: 'src/pages/book/BookingPage.tsx',
    imports: ['assets/shared.js'],
    css: ['assets/BookingPage.css'],
    modules: ['src/pages/book/BookingPage.tsx'],
  }),
  'assets/CalendarPage.js': chunk({
    facade: 'src/pages/calendar/CalendarPage.tsx',
    imports: ['assets/shared.js'],
    modules: ['src/pages/calendar/CalendarPage.tsx'],
  }),
}

test('the booking page loads the entry, the shared chunks, its own chunk and their styles, not the cabinet', () => {
  expect(bookChunkFiles(chunks).sort()).toEqual([
    'assets/BookingPage.css',
    'assets/BookingPage.js',
    'assets/index.css',
    'assets/index.js',
    'assets/shared.js',
  ])
  expect(foreignPages(chunks)).toEqual([])
})

test('the routes’ search parsers may sit in the entry chunk', () => {
  const parsers: Chunks = {
    ...chunks,
    'assets/index.js': chunk({
      ...chunks['assets/index.js'],
      modules: ['src/pages/calendar/calendarSearch.ts'],
    }),
  }
  expect(foreignPages(parsers)).toEqual([])
})

test('a cabinet page merged into the entry chunk is named', () => {
  const merged: Chunks = {
    ...chunks,
    'assets/index.js': chunk({
      ...chunks['assets/index.js'],
      modules: ['src/pages/calendar/CalendarPage.tsx'],
    }),
  }
  expect(foreignPages(merged)).toEqual(['src/pages/calendar/CalendarPage.tsx'])
})

test('a cabinet page merged into a shared chunk is named', () => {
  const merged: Chunks = {
    ...chunks,
    'assets/shared.js': chunk({
      modules: ['src/pages/cabinet/Cabinet.module.scss'],
    }),
  }
  expect(foreignPages(merged)).toEqual([
    'src/pages/cabinet/Cabinet.module.scss',
  ])
})

test('a build without the booking page fails loudly, not as a pass', () => {
  const { 'assets/BookingPage.js': _gone, ...rest } = chunks
  expect(() => bookChunkFiles(rest)).toThrow(/BookingPage/)
})
