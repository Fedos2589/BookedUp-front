// What the booking page (`/book/…`) loads, read from Vite's build manifest
// (`build.manifest`, dist/.vite/manifest.json). A client opens it on a phone:
// it must not pull the cabinet's pages. Run by scripts/check-book-chunk.mjs.

export type ManifestChunk = {
  file: string
  src?: string
  isEntry?: boolean
  isDynamicEntry?: boolean
  imports?: string[]
  dynamicImports?: string[]
}
export type Manifest = Record<string, ManifestChunk>

const ENTRY = 'index.html'
const BOOKING_PAGE = 'src/pages/book/BookingPage.tsx'
// Pages every route may share, and the booking page's own folder.
const ALLOWED_PAGES = [/^src\/pages\/book\//, /^src\/pages\/PagePending\./]

// Manifest keys of every chunk the booking page loads: the entry and the
// booking page's own chunk, each with its static imports.
function loadedKeys(manifest: Manifest): string[] {
  if (!manifest[ENTRY]) throw new Error(`${ENTRY} is not in the manifest`)
  if (!manifest[BOOKING_PAGE])
    throw new Error(
      `${BOOKING_PAGE} is not in the manifest: BookingPage is not a chunk of its own`,
    )
  const seen = new Set<string>()
  const visit = (key: string) => {
    if (seen.has(key)) return
    seen.add(key)
    for (const next of manifest[key]?.imports ?? []) visit(next)
  }
  visit(ENTRY)
  visit(BOOKING_PAGE)
  return [...seen]
}

// The files the booking page downloads.
export function bookChunkFiles(manifest: Manifest): string[] {
  return loadedKeys(manifest).map((key) => manifest[key].file)
}

// Page modules outside src/pages/book/ that the booking page loads: each one is
// the cabinet's code on a client's phone.
export function foreignPages(manifest: Manifest): string[] {
  return loadedKeys(manifest).filter(
    (key) =>
      key.startsWith('src/pages/') &&
      !ALLOWED_PAGES.some((allowed) => allowed.test(key)),
  )
}
