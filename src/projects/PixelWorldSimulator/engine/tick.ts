import { Grid } from '../pixel-world.types'
import { Rng } from './rng'
import { step } from './step'
import { simulateHeat } from './heat'
import { advanceTimers } from './timers'
import { applyReactions } from './reactions'

/**
 * One world tick, in order: things move, heat spreads and transforms what it touches, clocks run
 * down, then chemistry happens. Movement goes first so a falling drop of water meets the lava this
 * tick rather than next one.
 */
export function tickWorld(grid: Grid, rng: Rng, tick: number): void {
  step(grid, rng, tick)
  simulateHeat(grid)
  advanceTimers(grid, rng)
  applyReactions(grid, rng)
}
