// The grid is the whole day, and the page scrolls it (the grid has no scroll of
// its own, so there is one scrollbar, not two). This scrolls the page so the
// hour of `minute` is at the top. Rows and columns are the kit's: the first
// column's body (the second of its children, under the header) is as tall as
// the day, so a minute is that far down it. A little room is left above for
// the hour's label, which sits half above its line.
const LABEL_ROOM = 16

export function scrollToMinute(grid: HTMLElement, minute: number) {
  const body = grid.querySelector<HTMLElement>(
    '[aria-labelledby] > :nth-child(2)',
  )
  if (!body) return
  const top =
    body.getBoundingClientRect().top +
    window.scrollY +
    (minute / 1440) * body.offsetHeight -
    LABEL_ROOM
  window.scrollTo({ top: Math.max(0, top) })
}
