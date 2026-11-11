import { useEffect, useState } from 'react'

const msToNextMinute = (now: Date) =>
  60_000 - (now.getSeconds() * 1_000 + now.getMilliseconds())

// The current moment for clocks like "It's 10:41 there now": it turns over
// exactly with the minute, and is current again as soon as the app comes back
// to the screen (iOS and Android freeze an installed app's timers in the
// background). Read once per render, not new Date() inside render (impure).
export function useNow() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      const current = new Date()
      setNow(current)
      clearTimeout(timer)
      timer = setTimeout(tick, msToNextMinute(current))
    }
    timer = setTimeout(tick, msToNextMinute(new Date()))

    const onVisible = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return now
}
