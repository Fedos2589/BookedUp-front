import {
  type ReactNode,
  type RefObject,
  useEffectEvent,
  useLayoutEffect,
} from 'react'

import styles from './Calendar.module.scss'
import { scrollToMinute } from './scrollToMinute'

// The day grid's scroll box. It opens on `openAt` (minutes after midnight)
// once, when it mounts: the calendar gives it a new key for each day, week and
// master, so each opens on its own bookings, and a reload of the same day
// keeps where the user scrolled.
export function GridBox({
  ref,
  openAt,
  children,
}: {
  ref: RefObject<HTMLDivElement | null>
  openAt: number
  children: ReactNode
}) {
  const open = useEffectEvent(() => {
    if (ref.current) scrollToMinute(ref.current, openAt)
  })
  useLayoutEffect(() => open(), [])

  return (
    <div ref={ref} tabIndex={-1} className={styles.gridBox}>
      {children}
    </div>
  )
}
