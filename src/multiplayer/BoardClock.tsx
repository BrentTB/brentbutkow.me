import { LOW_CLOCK_SECONDS, formatClock, useTurnClock } from './useTurnClock'

interface BoardClockProps {
  /** The deadline from the room, or null when no clock is running. */
  turnEndsAt: string | null
  /** The game's wording for the remaining time, e.g. `(clock) => `${clock} left``. */
  label: (clock: string) => string
  /** The game's own class, so it can be placed and shown or hidden per layout. */
  className?: string
}

/**
 * The turn clock as a standalone line, for a game that wants it somewhere other than the room panel —
 * on a phone, directly under the board rather than buried in the settings below it. Renders nothing
 * when no clock is running; the game's own CSS decides where and when it shows.
 */
export function BoardClock({ turnEndsAt, label, className }: BoardClockProps) {
  const secondsLeft = useTurnClock(turnEndsAt)
  if (secondsLeft === null) return null
  return (
    <p className={className} data-low={secondsLeft <= LOW_CLOCK_SECONDS || undefined}>
      {label(formatClock(secondsLeft))}
    </p>
  )
}
