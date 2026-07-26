import { Grid, MaterialBehavior, MaterialId } from '../pixel-world.types'
import { AMBIENT_TEMPERATURE } from '../data'
import { MATERIALS, isBurning } from './materials'
import { transformCell } from './grid'
import { detonate, flashOver } from './forces'

/**
 * How hard a self-heating or burning cell holds its own temperature against its surroundings. The
 * per-tick caps below are what bound the rate; this only has to be strong enough that a cube of ice
 * dropped in a pool actually sits near its own temperature instead of settling a few degrees below
 * the water around it.
 */
const HEAT_PULL = 0.3
/**
 * Degrees per tick a hot cell can regain. Without the cap, lava is an infinite battery: it reheats
 * faster than a pool can drain it, so it never crusts and the water all boils away.
 */
const SELF_HEAT_MAX = 55
/** Cold holds on more gently than heat, so a block of ice creeps across a pool instead of snapping it. */
const SELF_CHILL_MAX = 22
/**
 * How hard a flame pushes heat straight into the cells around it, and the most it can give in one
 * tick. Diffusion alone is too slow to light a plank, since a flame only touches its fuel briefly.
 */
const RADIATE = 0.3
const RADIATE_MAX = 45
/**
 * Frost is slow on purpose. At the same rate as radiated heat, a single ice cube froze a whole pool
 * in a second or two, which read as a bug rather than as ice.
 */
const CHILL_MAX = 3
/**
 * Degrees a boiling cell takes out of its hottest neighbour. Turning water to steam costs energy, and
 * that energy comes from whatever was heating it — which is what lets a splash of water crust lava.
 */
const LATENT_HEAT = 260
/** How fast every cell leaks toward room temperature, so a world eventually cools down. */
const AMBIENT_PULL = 0.01

// Per-material lookups, so the three passes index flat arrays instead of walking objects 60,000
// times a tick. Zero means "no heat source", which no real source uses.
const CONDUCTIVITY = new Float32Array(MATERIALS.map((material) => material.conductivity))
const SELF_HEAT = new Int16Array(MATERIALS.map((material) => material.selfHeat ?? 0))
const BURN_HEAT = new Int16Array(MATERIALS.map((material) => material.ignite?.heat ?? 0))
const REACTS_TO_HEAT = new Uint8Array(
  MATERIALS.map((material) =>
    material.hot !== undefined ||
    material.cold !== undefined ||
    material.ignite !== undefined ||
    material.explodes !== undefined
      ? 1
      : 0
  )
)

/**
 * The heat pass: flames warm what they touch, temperature diffuses, and any cell that crosses one of
 * its thresholds becomes something else. Every melt, freeze, boil, and ignition in the sim comes out
 * of this one function plus the numbers in the material table.
 */
export function simulateHeat(grid: Grid): void {
  radiate(grid)
  diffuse(grid)
  applyThresholds(grid)
}

/** Rows the heat pass has to visit: everything else is room temperature with nothing hot nearby. */
function isSleeping(grid: Grid, row: number): boolean {
  return grid.hotRows[row] === 0
}

/**
 * Cells that hold a temperature of their own push it into their four neighbours: flames and lava
 * warm what they touch, ice chills it. Diffusion alone can't do this job — a flame rises a cell per
 * tick, so it only ever touches its fuel for a moment.
 */
function radiate(grid: Grid): void {
  const { width, height, material, temperature, burn } = grid

  for (let y = 0; y < height; y++) {
    if (isSleeping(grid, y)) continue
    for (let x = 0; x < width; x++) {
      const index = y * width + x
      const id = material[index]
      const source = isBurning(burn[index]) ? BURN_HEAT[id] : SELF_HEAT[id]
      if (source === 0) continue

      if (y > 0) pull(temperature, index - width, source)
      if (y < height - 1) pull(temperature, index + width, source)
      if (x > 0) pull(temperature, index - 1, source)
      if (x < width - 1) pull(temperature, index + 1, source)
    }
  }
}

function pull(temperature: Int16Array, index: number, source: number): void {
  const current = temperature[index]
  if (current === source) return

  const step =
    current < source
      ? Math.min((source - current) * RADIATE, RADIATE_MAX)
      : -Math.min((current - source) * RADIATE, CHILL_MAX)
  temperature[index] = Math.round(current + step)
}

function diffuse(grid: Grid): void {
  const { width, height, material, temperature, temperatureNext, burn, hotRowsNext } = grid
  hotRowsNext.fill(0)

  for (let y = 0; y < height; y++) {
    if (isSleeping(grid, y)) continue
    for (let x = 0; x < width; x++) {
      const index = y * width + x
      const current = temperature[index]

      // Edges reflect their own temperature, so the walls neither heat nor sink the world.
      const up = y > 0 ? temperature[index - width] : current
      const down = y < height - 1 ? temperature[index + width] : current
      const left = x > 0 ? temperature[index - 1] : current
      const right = x < width - 1 ? temperature[index + 1] : current

      const id = material[index]
      const source = isBurning(burn[index]) ? BURN_HEAT[id] : SELF_HEAT[id]

      // Most of the world is room temperature most of the time, and room temperature surrounded by
      // room temperature has nothing to compute.
      if (
        source === 0 &&
        current === AMBIENT_TEMPERATURE &&
        up === AMBIENT_TEMPERATURE &&
        down === AMBIENT_TEMPERATURE &&
        left === AMBIENT_TEMPERATURE &&
        right === AMBIENT_TEMPERATURE
      ) {
        temperatureNext[index] = AMBIENT_TEMPERATURE
        continue
      }

      // Each interface is limited by the worse conductor of the pair, which is what lets air
      // insulate: lava dumps heat into water fast and barely loses any to the air around it.
      const conductivity = CONDUCTIVITY[id]
      let flow = 0
      if (y > 0) flow += transferred(conductivity, material[index - width], up - current)
      if (y < height - 1) flow += transferred(conductivity, material[index + width], down - current)
      if (x > 0) flow += transferred(conductivity, material[index - 1], left - current)
      if (x < width - 1) flow += transferred(conductivity, material[index + 1], right - current)

      let next = current + flow / 4

      if (source !== 0 && next !== source) {
        next +=
          next < source
            ? Math.min((source - next) * HEAT_PULL, SELF_HEAT_MAX)
            : -Math.min((next - source) * HEAT_PULL, SELF_CHILL_MAX)
      }

      // Round-tripping through an integer stalls a slow drift forever (a 0.5° step rounds back to
      // where it started), so the last degree of cooling is taken whole.
      const drift = (AMBIENT_TEMPERATURE - next) * AMBIENT_PULL
      next += Math.abs(drift) < 1 ? Math.sign(drift) : drift

      const settled = Math.round(next)
      temperatureNext[index] = settled
      if (settled !== AMBIENT_TEMPERATURE || source !== 0) wake(hotRowsNext, y, height)
    }
  }

  const sleeping = grid.hotRows
  grid.temperature = temperatureNext
  grid.temperatureNext = temperature
  grid.hotRows = hotRowsNext
  grid.hotRowsNext = sleeping
}

function wake(rows: Uint8Array, row: number, height: number): void {
  rows[row] = 1
  if (row > 0) rows[row - 1] = 1
  if (row < height - 1) rows[row + 1] = 1
}

/** Takes the latent heat of the change out of whichever neighbour was hottest. */
function billHottestNeighbour(grid: Grid, index: number, x: number, y: number): void {
  const { width, height, temperature } = grid

  // Unrolled rather than a helper closure: this runs on every boiling cell, every tick.
  let hottest = -1
  let peak = -Infinity

  if (y > 0 && temperature[index - width] > peak) {
    peak = temperature[index - width]
    hottest = index - width
  }
  if (y < height - 1 && temperature[index + width] > peak) {
    peak = temperature[index + width]
    hottest = index + width
  }
  if (x > 0 && temperature[index - 1] > peak) {
    peak = temperature[index - 1]
    hottest = index - 1
  }
  if (x < width - 1 && temperature[index + 1] > peak) {
    peak = temperature[index + 1]
    hottest = index + 1
  }

  // Never past the boiling cell's own temperature: heat does not flow from cold to hot, and without the
  // floor a neighbour sitting just over boiling gets billed the full 260° and lands below freezing. That
  // is what turned the heat tool held in a pool into a ring of ice.
  if (hottest >= 0 && peak > temperature[index]) {
    temperature[hottest] = Math.max(temperature[index], peak - LATENT_HEAT)
  }
}

/** Heat crossing one interface, in degrees, positive when the neighbour is hotter. */
function transferred(conductivity: number, neighbourMaterial: number, gap: number): number {
  return Math.min(conductivity, CONDUCTIVITY[neighbourMaterial]) * gap
}

function applyThresholds(grid: Grid): void {
  const { width, height, material, temperature, burn } = grid

  for (let y = 0; y < height; y++) {
    if (isSleeping(grid, y)) continue
    for (let x = 0; x < width; x++) {
      const index = y * width + x
      const id = material[index]
      if (id === MaterialId.empty || REACTS_TO_HEAT[id] === 0) continue

      const cell = MATERIALS[id]
      const heat = temperature[index]

      // A phase change eats the heat that drove it. The cell drops to the threshold it crossed, and
      // boiling also bills its hottest neighbour, so a splash of water genuinely cools the lava it
      // lands on rather than steaming off it for free.
      if (cell.hot !== undefined && heat >= cell.hot.at) {
        transformCell(grid, index, cell.hot.into)
        temperature[index] = cell.hot.at
        billHottestNeighbour(grid, index, x, y)
        continue
      }
      if (cell.cold !== undefined && heat <= cell.cold.at) {
        transformCell(grid, index, cell.cold.into)
        temperature[index] = cell.cold.at
        continue
      }
      // A charge goes off rather than burning: the pulse it writes is what sets the next one off.
      if (cell.explodes !== undefined && heat >= cell.explodes.at) {
        detonate(grid, index, x, y)
        continue
      }
      // Fuel catches once and burns on its own timer, so re-ignition can't reset the countdown.
      if (cell.ignite !== undefined && burn[index] === 0 && heat >= cell.ignite.at) {
        burn[index] = cell.ignite.ticks
        // A pocket of gas catching is a detonation, not a candle.
        if (cell.behavior === MaterialBehavior.gas) flashOver(grid, x, y)
      }
    }
  }
}
