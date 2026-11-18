import { useEffect, useState } from 'react'

// `value`, `delayMs` after it last changed.
export function useDebounced<T>(value: T, delayMs: number) {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])
  return settled
}
