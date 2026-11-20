import { useMatches } from '@tanstack/react-router'

// The calendar is one screen high: the page does not scroll, the day grid in
// it does, so the header stays in view. Its layout reads this to hold the
// frame to the screen's height; every other page keeps growing and scrolling.
export const useFillsScreen = () =>
  useMatches().some((match) => match.routeId.endsWith('/calendar'))
