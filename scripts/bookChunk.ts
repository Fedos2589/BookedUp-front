// What the booking page (`/book/…`) loads, read from the chunk map that the
// `chunk-modules` plugin of vite.config.ts writes at build time. A client opens
// it on a phone: it must not pull the cabinet's pages. The map lists the source
// modules inside each chunk, so a page Rollup merged into a shared chunk shows
// too (Vite's own manifest names only entry chunks). Run by
// scripts/check-book-chunk.mjs.

export type Chunk = {
  isEntry: boolean
  facade?: string
  imports: string[]
  css: string[]
  modules: string[]
}
export type Chunks = Record<string, Chunk>

const BOOKING_PAGE = 'src/pages/book/BookingPage.tsx'
// The booking page's own folder, the shared loading screen and the routes'
// search and param parsers (pure, tiny; the router needs them up front).
const ALLOWED_PAGES = [
  /^src\/pages\/book\//,
  /^src\/pages\/PagePending\./,
  /^src\/pages\/calendar\/calendarSearch\./,
  /^src\/pages\/clients\/clientsSearch\./,
  /^src\/pages\/invite\/invitationToken\./,
]

// Files of every chunk the booking page loads: the entry and the booking
// page's own chunk, each with its static imports.
function loadedFiles(chunks: Chunks): string[] {
  const entry = Object.keys(chunks).find((file) => chunks[file].isEntry)
  const booking = Object.keys(chunks).find(
    (file) => chunks[file].facade === BOOKING_PAGE,
  )
  if (!entry) throw new Error('the build has no entry chunk')
  if (!booking)
    throw new Error(
      `${BOOKING_PAGE} is not a chunk of its own: BookingPage is not lazy`,
    )
  const seen = new Set<string>()
  const visit = (file: string) => {
    if (seen.has(file)) return
    seen.add(file)
    for (const next of chunks[file]?.imports ?? []) visit(next)
  }
  visit(entry)
  visit(booking)
  return [...seen]
}

// The files the booking page downloads, stylesheets included.
export function bookChunkFiles(chunks: Chunks): string[] {
  return [
    ...new Set(
      loadedFiles(chunks).flatMap((file) => [file, ...chunks[file].css]),
    ),
  ]
}

// Page modules outside the allowed ones that the booking page loads: each is
// the cabinet's code on a client's phone.
export function foreignPages(chunks: Chunks): string[] {
  return loadedFiles(chunks)
    .flatMap((file) => chunks[file].modules)
    .filter(
      (id) =>
        id.startsWith('src/pages/') &&
        !ALLOWED_PAGES.some((allowed) => allowed.test(id)),
    )
}
