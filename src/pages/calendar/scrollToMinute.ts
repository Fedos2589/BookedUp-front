// The grid in `box` is the whole day, top to bottom, so the hour of `minute`
// is that share of the box's scroll height down. The column names above the
// hours make it land a little early, never late. A little room is left above
// for the hour's label, which sits half above its line.
const LABEL_ROOM = 16

export function scrollToMinute(box: HTMLElement, minute: number) {
  box.scrollTop = Math.max(0, (minute / 1440) * box.scrollHeight - LABEL_ROOM)
}
