import { useCallback, useState } from 'react'
import { FlipSpeed, isFlipSpeed } from './othello.types'

/** Where the preference lives. Namespaced by game, since the site keeps several unrelated keys. */
export const FLIP_SPEED_KEY = 'othello-flip-speed'

/** Fast, as the board has always turned. Slow is something a player opts into. */
export const DEFAULT_FLIP_SPEED = FlipSpeed.fast

function read(): FlipSpeed {
  try {
    const raw = localStorage.getItem(FLIP_SPEED_KEY)
    return isFlipSpeed(raw) ? raw : DEFAULT_FLIP_SPEED
  } catch {
    // Blocked storage (private mode, a quota error) is the same as never having chosen.
    return DEFAULT_FLIP_SPEED
  }
}

function write(speed: FlipSpeed): void {
  try {
    localStorage.setItem(FLIP_SPEED_KEY, speed)
  } catch {
    // A game that plays is worth more than a saved preference.
  }
}

export type FlipSpeedControl = {
  flipSpeed: FlipSpeed
  choose: (speed: FlipSpeed) => void
}

/**
 * How fast captured discs turn over, kept in `localStorage`. Unlike the online move-commit setting,
 * this one is on show in every game, local or online.
 */
export function useFlipSpeed(): FlipSpeedControl {
  const [flipSpeed, setFlipSpeed] = useState<FlipSpeed>(read)

  const choose = useCallback((speed: FlipSpeed) => {
    setFlipSpeed(speed)
    write(speed)
  }, [])

  return { flipSpeed, choose }
}
