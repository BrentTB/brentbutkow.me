import { Grid } from '../pixel-world.types'
import { Rng } from './rng'
import { step } from './step'
import { simulateHeat } from './heat'
import { advanceTimers } from './timers'
import { applyReactions } from './reactions'
import { moveKinetic } from './kinetic'
import { simulateLife } from './life'
import { advanceChunks } from './chunks'
import { simulateAir } from './air'

/**
 * One world tick: chemistry acts on the world as it stands, then things move, then heat spreads and
 * transforms what it touches, then clocks run down.
 *
 * Creatures act in the same window as chemistry, before anything moves: they decide from the world as it
 * was painted, and they move themselves, so the material pass has nothing to say about them.
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
 *
 * Air sits between the two movement passes, and that is the answer to the feedback loop the spec worried
 * about. It reads temperature and walls, never momentum, so material can never push air back: the flow is
 * driven only by heat and by explicit sources, and anything it grabs is moving by the end of the same tick.
 */
export function tickWorld(grid: Grid, rng: Rng, tick: number): void {
  applyReactions(grid, rng)
  simulateLife(grid, rng, tick)
  step(grid, rng, tick)
  simulateAir(grid, tick)
  moveKinetic(grid, rng)
  simulateHeat(grid)
  advanceTimers(grid, rng)
  // Last, so every wake this tick recorded is what the next one starts from.
  advanceChunks(grid)
}
