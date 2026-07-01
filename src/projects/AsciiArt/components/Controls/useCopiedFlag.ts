import { useCallback, useEffect, useRef, useState } from 'react'

// Runs an async copy action and, on success, flashes a "copied" flag for a short
// window so a button can confirm the copy without a persistent state change.
export function useCopiedFlag(duration = 1500) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<number | null>(null)

  const flash = useCallback(
    async (action: () => Promise<boolean>) => {
      if (!(await action())) return
      setCopied(true)
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
      timerRef.current = window.setTimeout(() => setCopied(false), duration)
    },
    [duration]
  )

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    },
    []
  )

  return [copied, flash] as const
}
