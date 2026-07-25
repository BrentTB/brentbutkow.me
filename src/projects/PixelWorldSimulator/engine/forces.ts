import { Grid, MaterialBehavior, MaterialId } from '../pixel-world.types'
import { cellIndex, markHotRow, transformCell } from './grid'
import { MATERIALS } from './materials'
import { push } from './kinetic'

/**
 * Cells per tick the attract tool adds at its strongest. It has to be a grab, not a nudge: at a third of
 * this, dragging a pile anywhere took slow, careful sweeps at the largest brush, which is irritating
 * rather than powerful.
 */
const PULL_STRENGTH = 4.5
/**
 * Cells per tick a blast writes at the centre. Deliberately violent: this is the tool people reach for to
 * throw a heap of gravel across the world.
 */
const BLAST_STRENGTH = 9
/** Cells per tick a held wind adds each tick, along the direction of the drag. */
const WIND_STRENGTH = 2.4
/**
 * The smallest disc a force works over, whatever the brush is set to. Force falls off to nothing at the
 * rim, so a brush-sized blast at the smallest setting had almost no room to push anything at all.
 */
const MIN_REACH = 12
/**
 * How much of a force survives to the rim, so the outer half of the disc still moves things. A straight
 * linear falloff to zero meant only cells near the middle ever went anywhere.
 */
const RIM_SHARE = 0.35
/**
 * °C the blast tool writes at the centre. High enough that the cells right at the middle clear wood's
 * 250° ignition point even after falloff — a blast that throws a plank without lighting it is a let-down.
 * The rim still gets almost nothing, so it scorches the middle rather than torching the whole disc.
 */
const BLAST_HEAT = 360
/** °C one press of heat or chill moves the cells under the brush. */
const TEMPERATURE_STEP = 90

/** The coldest and hottest the brush tools will drive a cell, so neither can run away. */
const TEMPERATURE_FLOOR = -220
const TEMPERATURE_CEILING = 1800

/**
 * The density a force is calibrated against: sand takes the strength as written, anything lighter goes
 * further and anything heavier goes less far. Without this every material flew identically, which made
 * splinters of glass behave like wet gravel.
 */
const REFERENCE_DENSITY = 60
/** Bounds on that, so nothing is either immovable or launched into orbit. */
const LIGHTEST = 2.2
const HEAVIEST = 0.45

/** How far a given material is thrown by the same impulse. Lighter cells fly. */
function massFactor(id: number): number {
  const { density } = MATERIALS[id]
  if (density <= 0) return 1
  return Math.max(HEAVIEST, Math.min(LIGHTEST, REFERENCE_DENSITY / density))
}

/**
 * Whether a force can pick this cell up at all. Static materials are the world's scaffolding: a wall you
 * built should not drift toward the pointer or blow away in the wind.
 */
function isMovable(id: number): boolean {
  return id !== MaterialId.empty && MATERIALS[id].behavior !== MaterialBehavior.static
}

/**
 * Runs `apply` over every cell in a disc, handing it the offset from the centre and how strongly the
 * centre reaches it — full at the pointer, nothing at the rim. Every tool and every explosion is this
 * same walk with a different body, which is why the powers were cheap once momentum existed.
 */
function overDisc(
  grid: Grid,
  cx: number,
  cy: number,
  radius: number,
  apply: (index: number, dx: number, dy: number, falloff: number) => void
): void {
  const reach = Math.max(MIN_REACH, Math.floor(radius))

  for (let dy = -reach; dy <= reach; dy++) {
    for (let dx = -reach; dx <= reach; dx++) {
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (distance > reach) continue

      const x = cx + dx
      const y = cy + dy
      if (x < 0 || x >= grid.width || y < 0 || y >= grid.height) continue

      const falloff = 1 - (1 - RIM_SHARE) * (distance / reach)
      apply(cellIndex(grid, x, y), dx, dy, falloff)
    }
  }
}

/** Pulls loose cells toward the pointer, black-hole style. */
export function attract(grid: Grid, cx: number, cy: number, radius: number): void {
  overDisc(grid, cx, cy, radius, (index, dx, dy, falloff) => {
    if (!isMovable(grid.material[index])) return

    const distance = Math.sqrt(dx * dx + dy * dy)
    if (distance === 0) return

    // Direction only: dividing the strength by the distance as well made anything more than a few cells
    // out barely twitch, which is the opposite of a black hole.
    const speed = PULL_STRENGTH * falloff * massFactor(grid.material[index])
    push(grid, index, (-dx / distance) * speed, (-dy / distance) * speed)
  })
}

/** Throws everything outward and warms it, so things shoot up and whatever can catch fire does. */
export function blast(grid: Grid, cx: number, cy: number, radius: number): void {
  impulse(grid, cx, cy, radius, BLAST_STRENGTH, BLAST_HEAT)
}

/** Pushes along the drag direction while the pointer is held. */
export function wind(
  grid: Grid,
  cx: number,
  cy: number,
  radius: number,
  dx: number,
  dy: number
): void {
  const length = Math.sqrt(dx * dx + dy * dy)
  if (length === 0) return

  const ux = dx / length
  const uy = dy / length

  overDisc(grid, cx, cy, radius, (index, _dx, _dy, falloff) => {
    if (!isMovable(grid.material[index])) return
    const speed = WIND_STRENGTH * falloff * massFactor(grid.material[index])
    push(grid, index, ux * speed, uy * speed)
  })
}

/** Raises or lowers the temperature under the brush, for melting and freezing without painting. */
export function temper(grid: Grid, cx: number, cy: number, radius: number, warming: boolean): void {
  const step = warming ? TEMPERATURE_STEP : -TEMPERATURE_STEP

  overDisc(grid, cx, cy, radius, (index, _dx, _dy, falloff) => {
    const next = grid.temperature[index] + step * falloff
    grid.temperature[index] = Math.round(
      Math.max(TEMPERATURE_FLOOR, Math.min(TEMPERATURE_CEILING, next))
    )
    markHotRow(grid, index)
  })
}

/**
 * An outward shove plus a heat pulse. Shared by the blast tool and by every explosive: a charge is
 * nothing more than a cell that calls this on itself when it gets hot enough.
 */
function impulse(
  grid: Grid,
  cx: number,
  cy: number,
  radius: number,
  strength: number,
  heat: number
): void {
  overDisc(grid, cx, cy, radius, (index, dx, dy, falloff) => {
    if (heat > 0) {
      // Written as a floor rather than added, so overlapping blasts don't stack into a fake sun.
      const pulse = Math.round(heat * falloff)
      if (grid.temperature[index] < pulse) grid.temperature[index] = pulse
      markHotRow(grid, index)
    }

    if (!isMovable(grid.material[index])) return

    const thrown = strength * massFactor(grid.material[index])
    const distance = Math.sqrt(dx * dx + dy * dy)
    // The cell at the centre has no direction to go, so it takes the shove straight up.
    if (distance === 0) {
      push(grid, index, 0, -thrown)
      return
    }

    const speed = thrown * falloff
    push(grid, index, (dx / distance) * speed, (dy / distance) * speed)
  })
}

/** How far a pocket of gas throws things when it flashes over, and how hard. */
const FLASH_RADIUS = 4
const FLASH_STRENGTH = 1.1

/**
 * A gas catching fire goes off with a shove instead of politely burning. Every gas with an `ignite`
 * entry gets this for free, so methane pockets detonate and anything flammable added later does too.
 * No heat of its own: the flame it just became is already the heat.
 */
export function flashOver(grid: Grid, x: number, y: number): void {
  impulse(grid, x, y, FLASH_RADIUS, FLASH_STRENGTH, 0)
}

/**
 * Sets a charge off: it becomes whatever it leaves behind, then throws and heats everything around it.
 * The heat is what chains one charge into the next, so a buried line of TNT goes up as a line.
 */
export function detonate(grid: Grid, index: number, x: number, y: number): void {
  const charge = MATERIALS[grid.material[index]].explodes
  if (charge === undefined) return

  transformCell(grid, index, charge.into)
  grid.temperature[index] = charge.heat
  markHotRow(grid, index)

  impulse(grid, x, y, charge.radius, charge.impulse, charge.heat)
}
