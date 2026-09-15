import { COPY_FADE_HOLD_MS, prefersReducedMotion } from '@utils/motion'
import { useCallback, useEffect, useRef } from 'react'

export function useCloseAfterHold(close: () => void) {
  const closeRef = useRef(close)
  closeRef.current = close

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancel = useCallback(() => {
    if (timerRef.current == null) return
    clearTimeout(timerRef.current)
    timerRef.current = null
  }, [])

  const schedule = useCallback(() => {
    cancel()
    if (prefersReducedMotion()) {
      closeRef.current()
      return
    }
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      closeRef.current()
    }, COPY_FADE_HOLD_MS)
  }, [cancel])

  useEffect(() => cancel, [cancel])

  return { schedule, cancel }
}
