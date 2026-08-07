import { useEffect, useState } from 'react'

/** Where the countdown turns urgent, which is about when it starts affecting how you play. */
export const LOW_CLOCK_SECONDS = 10

/**
 * Seconds left on the current turn, or null when no clock is running.
 *
 * Display only: the server owns the deadline and decides the game on its own, so a slow or fiddled
 * clock here changes nothing about who wins. It stops at zero rather than counting into negatives,
 * which is where the server takes over.
 *
 * Ticks are aligned to the deadline's own second boundaries. An interval started mid-second drifts
 * against them, and a countdown that lands twice inside one second shows that number twice and then
 * skips the next one.
 */
export function useTurnClock(turnEndsAt: string | null): number | null {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)

  useEffect(() => {
    const deadline = turnEndsAt === null ? Number.NaN : Date.parse(turnEndsAt)
    if (Number.isNaN(deadline)) {
      setSecondsLeft(null)
      return
    }

    const remaining = () => Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
    const opening = remaining()
    setSecondsLeft(opening)
    if (opening === 0) return

    let tick: ReturnType<typeof setInterval> | null = null
    // Whatever is left of the current second, so the first tick lands on a boundary and the rest follow.
    const lead = setTimeout(
      () => {
        setSecondsLeft(remaining())
        tick = setInterval(() => {
          const left = remaining()
          setSecondsLeft(left)
          // Nothing left to count: the server decides the timeout from here.
          if (left === 0 && tick !== null) clearInterval(tick)
        }, 1000)
      },
      (((deadline - Date.now()) % 1000) + 1000) % 1000 || 1000
    )

    return () => {
      clearTimeout(lead)
      if (tick !== null) clearInterval(tick)
    }
  }, [turnEndsAt])

  return secondsLeft
}

/** A count of seconds as m:ss, so a two-minute limit does not read as "97". */
export function formatClock(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
}
