import { useMatches } from '@tanstack/react-router'

// A page one screen high (the route's `staticData.fillsScreen`, the calendar)
// does not scroll, a box in it does, so the header stays in view. The layouts
// read this to hold the frame to the screen's height; every other page keeps
// growing and scrolling.
export const useFillsScreen = () =>
  useMatches().some((match) => match.staticData.fillsScreen)
