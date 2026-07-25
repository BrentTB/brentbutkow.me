import { Grid } from '../pixel-world.types'
import { Rng } from './rng'
import { step } from './step'
import { simulateHeat } from './heat'
import { advanceTimers } from './timers'
import { applyReactions } from './reactions'
import { moveKinetic } from './kinetic'

/**
 * One world tick: chemistry acts on the world as it stands, then things move, then heat spreads and
 * transforms what it touches, then clocks run down.
 *
 * **Chemistry goes before movement, and that ordering is load-bearing.** The brush paints between
 * ticks, so a drop poured under a plant or an ice cube is adjacent to it only until the next movement
 * pass — with movement first, that drop was always a row lower by the time contact reactions looked,
 * leaving a permanent one-cell gap under any solid that no amount of pouring could close.
 *
 * Heat stays after movement so a cell's temperature travels with it, and the timers stay after heat so
 * a cell lit this tick starts burning down from its full count.
 *
 * Cells in flight move after the ordinary pass, and `step` leaves them alone while they are: gravity is
 * already part of a kinetic cell's own motion, so letting both passes have a go at one sent debris down
 * twice as fast as it flew up.
 */
export function tickWorld(grid: Grid, rng: Rng, tick: number): void {
  applyReactions(grid, rng)
  step(grid, rng, tick)
  moveKinetic(grid, rng)
  simulateHeat(grid)
  advanceTimers(grid, rng)
}
