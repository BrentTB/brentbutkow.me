import { useEffect, useState } from 'react'

/**
 * Seconds left on the current turn, or null when no clock is running.
 *
 * Display only: the server owns the deadline and decides the game on its own, so a slow or fiddled
 * clock here changes nothing about who wins. It ticks once a second and stops at zero rather than
 * counting into negatives, which is where the server takes over.
 */
export function useTurnClock(turnEndsAt: string | null): number | null {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)

  useEffect(() => {
    if (turnEndsAt === null) {
      setSecondsLeft(null)
      return
    }

    const deadline = Date.parse(turnEndsAt)
    if (Number.isNaN(deadline)) {
      setSecondsLeft(null)
      return
    }

    const remaining = () => Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
    setSecondsLeft(remaining())

    const tick = setInterval(() => setSecondsLeft(remaining()), 1000)
    return () => clearInterval(tick)
  }, [turnEndsAt])

  return secondsLeft
}

/** A count of seconds as m:ss, so a two-minute limit does not read as "97". */
export function formatClock(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
}
