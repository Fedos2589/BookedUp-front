// The grid is the whole day; this scrolls its box so the hour of `minute` is at
// the top. Rows and columns are the kit's: the first column's body (the second
// of its children, under the header) is as tall as the day, so a minute is that
// far down it. A little room is left above for the hour's label, which sits
// half above its line.
const LABEL_ROOM = 16

export function scrollToMinute(box: HTMLElement, minute: number) {
  const body = box.querySelector<HTMLElement>(
    '[aria-labelledby] > :nth-child(2)',
  )
  // The top of the day is the top of the grid, with its column names.
  if (!body || minute <= 0) return
  const top =
    body.getBoundingClientRect().top -
    box.getBoundingClientRect().top +
    box.scrollTop
  box.scrollTop = Math.max(
    0,
    top + (minute / 1440) * body.offsetHeight - LABEL_ROOM,
  )
}
