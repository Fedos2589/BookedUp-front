import { useEffect, useRef } from 'react'

// A new step of the booking: focus goes to its heading, not to <body>
// (kit usage.md, Accessibility). Pass the ref to a Typography with tabIndex -1.
export function useStepHeading() {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => heading.current?.focus(), [])
  return heading
}
