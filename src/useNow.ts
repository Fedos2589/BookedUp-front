import { useEffect, useState } from 'react'

// The current moment, refreshed every `everyMs` while the component is shown —
// for clocks like "It's 10:41 there now". Read once per render, not new Date()
// inside render (impure).
export function useNow(everyMs = 30_000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), everyMs)
    return () => clearInterval(timer)
  }, [everyMs])
  return now
}
