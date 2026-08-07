import { FlipSpeed, isFlipSpeed } from './othello.types'
import { usePersistedChoice } from '../../utils/usePersistedChoice'

/** Where the preference lives. Namespaced by game, since the site keeps several unrelated keys. */
export const FLIP_SPEED_KEY = 'othello-flip-speed'

/** Fast, as the board has always turned. Slow is something a player opts into. */
export const DEFAULT_FLIP_SPEED = FlipSpeed.fast

export type FlipSpeedControl = {
  flipSpeed: FlipSpeed
  choose: (speed: FlipSpeed) => void
}

/**
 * How fast captured discs turn over, kept in `localStorage`. Unlike the online move-commit setting,
 * this one is on show in every game, local or online.
 */
export function useFlipSpeed(): FlipSpeedControl {
  const [flipSpeed, choose] = usePersistedChoice(FLIP_SPEED_KEY, isFlipSpeed, DEFAULT_FLIP_SPEED)
  return { flipSpeed, choose }
}
