// After `npm run build`: the booking page must not load the cabinet's pages.
// Prints the gzip size of what /book loads (scripts and styles) and of the
// service worker's precache.
//   npm run check:chunks
import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

import { bookChunkFiles, foreignPages } from './bookChunk.ts'

const DIST = new URL('../dist/', import.meta.url)
// Written by the `chunk-modules` plugin of vite.config.ts, outside dist/.
const chunks = JSON.parse(
  readFileSync(
    new URL('../node_modules/.cache/book-chunks.json', import.meta.url),
    'utf8',
  ),
)

const gzipKb = (files) =>
  (
    files.reduce(
      (sum, file) => sum + gzipSync(readFileSync(new URL(file, DIST))).length,
      0,
    ) / 1024
  ).toFixed(1)

const foreign = foreignPages(chunks)
if (foreign.length > 0) {
  console.error(
    `The booking page loads the cabinet's pages:\n  ${foreign.join('\n  ')}`,
  )
  process.exit(1)
}

const bookFiles = bookChunkFiles(chunks)
// sw.js lists the precache as {url:"assets/x.js",revision:…}.
const precache = [
  ...readFileSync(new URL('sw.js', DIST), 'utf8').matchAll(/url:"([^"]+)"/g),
].map((match) => match[1])
// An unreadable list (the plugin changed its format) must not pass as «0 files».
if (precache.length === 0) {
  console.error('No precache entries found in dist/sw.js')
  process.exit(1)
}

console.log(
  `/book loads ${bookFiles.length} files, ${gzipKb(bookFiles)} kB gzip`,
)
console.log(`precache: ${precache.length} files, ${gzipKb(precache)} kB gzip`)
