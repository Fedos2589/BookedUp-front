export const PAGE_SIZE = 20

type Page = { items: unknown[]; total: number }

// The offset of the next page: how many rows are shown; none once all are,
// or when a page came back empty.
export function nextOffset(last: Page, pages: Page[]): number | undefined {
  const shown = pages.reduce((sum, page) => sum + page.items.length, 0)
  return shown < last.total && last.items.length > 0 ? shown : undefined
}

// The pages as one list. A row added between two «Show more» shifts the
// offset and the next page repeats one: keep it once.
export function rowsOf<T extends { id: string }>(pages: { items: T[] }[]): T[] {
  const seen = new Set<string>()
  return pages
    .flatMap((page) => page.items)
    .filter((row) => !seen.has(row.id) && seen.add(row.id))
}
