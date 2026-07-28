import { Grid, MaterialId } from '../pixel-world.types'
import { AMBIENT_TEMPERATURE, TEMPERATURE_LIMITS } from '../data'
import { cellIndex, markHotRow, markHotRowBand, placeMaterial, transformCell } from './grid'
import { MATERIALS, isMovable } from './materials'
import { push } from './kinetic'
import { Rng } from './rng'
import { pushAir } from './air'

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
 * Cells per tick the wind tool puts into the air itself, on top of the shove it gives material directly.
 * Comfortably over the speed the flow needs to pick anything up, so a held drag reads as a gust that lingers
 * rather than a hand pushing individual grains.
 */
const WIND_AIR = 3.5
/**
 * The smallest disc a force works over, whatever the brush is set to, and whatever a charge's own radius says.
 * Force falls off to nothing at the rim, so a brush-sized blast at the smallest setting had almost no room to
 * push anything at all.
 *
 * It floors charges too, which makes `explodes.radius` a lower bound rather than the whole story: gunpowder
 * asks for 5 and gets 12. Tempting to "fix", and measurably faster, but it is what gunpowder was tuned
 * against — cut to its stated 5 it stopped throwing a sand bed at all. There is a test for that.
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
/** °C one press of heat or chill moves the cells under the brush, at its weakest. */
const TEMPERATURE_STEP = 90
/**
 * Extra grip, as a share of how far the cell already sits from room temperature. A flat step alone loses to
 * anything that makes its own heat: chill took 90° off a lava pool and the heat pass handed almost all of it
 * back through lava's own furnace and the surrounding pool, so a pool held under the brush settled 32° below
 * its own temperature and never set.
 *
 * Distance from room temperature is the thing to scale by, rather than distance from where the tool is
 * driving the cell: a source is resistant precisely because it holds an extreme temperature, while ordinary
 * material near room temperature keeps the flat step and the tools keep their old feel. Scaling by the gap
 * to the target instead gave a single tap of heat on cold water 375°, which boiled a pool on one click.
 */
const TEMPERATURE_PULL = 0.3

/**
 * Share of a blast's strength that goes into the air rather than straight into material. The draught is what
 * makes the seconds after an explosion interesting: debris curls, smoke billows outward, and a fire leans.
 */
const AIR_SHARE = 1.1
/**
 * How much wider than the blast itself the draught reaches. A blast wave shoves air far beyond the debris it
 * throws, and without this the flow only ever overlapped a couple of hundred of the twenty thousand cells in
 * the air — which is why turning it off changed nothing you could see.
 */
const AIR_REACH = 3

/**
 * The density a force is calibrated against: sand takes the strength as written, anything lighter goes
 * further and anything heavier goes less far. Without this every material flew identically, which made
 * splinters of glass behave like wet gravel.
 */
const REFERENCE_DENSITY = 60
/** Bounds on that, so nothing is either immovable or launched into orbit. */
const LIGHTEST = 2.2
const HEAVIEST = 0.45

// Per-material lookups, the way the heat pass keeps its own: a blast asks both of these questions for every
// cell in its disc, and a field of gunpowder going off asks them millions of times in a tick. Walking the
// material objects for an answer that never changes was most of what that cost.
const MASS_FACTOR = new Float32Array(
  MATERIALS.map(({ density }) =>
    density <= 0 ? 1 : Math.max(HEAVIEST, Math.min(LIGHTEST, REFERENCE_DENSITY / density))
  )
)

/** How far a given material is thrown by the same impulse. Lighter cells fly. */
function massFactor(id: number): number {
  return MASS_FACTOR[id]
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
  apply: (index: number, dx: number, dy: number, falloff: number, distance: number) => void,
  minReach = MIN_REACH
): void {
  const reach = Math.max(minReach, Math.floor(radius))
  // Squared, so the cells outside the circle are culled without a square root each. The root is only taken
  // for the cells that are actually inside it, where the falloff needs a real distance.
  const reachSq = reach * reach

  for (let dy = -reach; dy <= reach; dy++) {
    const y = cy + dy
    if (y < 0 || y >= grid.height) continue
    for (let dx = -reach; dx <= reach; dx++) {
      const spanSq = dx * dx + dy * dy
      if (spanSq > reachSq) continue

      const x = cx + dx
      if (x < 0 || x >= grid.width) continue

      const distance = Math.sqrt(spanSq)
      const falloff = 1 - (1 - RIM_SHARE) * (distance / reach)
      apply(cellIndex(grid, x, y), dx, dy, falloff, distance)
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

/** How far a black hole reaches, and how hard. Stronger than the attract tool: it is not a nudge. */
const HOLE_REACH = 18
const HOLE_STRENGTH = 6
/**
 * Cells per tick of swirl a turbine writes into the air. Into the air rather than into material, so the flow
 * carries things round and the coupling rules decide what is light enough to go.
 *
 * Strong enough to clear water's own bar in `carry`, because a device that cannot stir a pool is a
 * disappointment. Everything lighter than water was already moving at half this.
 */
const TURBINE_SWIRL = 15

/**
 * Pulls everything loose inward. Eating what arrives is the caller's job, and it matters: a puller that only
 * pulls is a permanent orbit machine, so the kinetic map never empties and nothing ever settles — which is
 * the exact shape of the performance problem the explosion work went in to fix.
 */
export function swallow(grid: Grid, cx: number, cy: number): void {
  overDisc(
    grid,
    cx,
    cy,
    HOLE_REACH,
    (index, dx, dy, falloff, distance) => {
      if (!isMovable(grid.material[index]) || distance === 0) return
      const speed = HOLE_STRENGTH * falloff * massFactor(grid.material[index])
      push(grid, index, (-dx / distance) * speed, (-dy / distance) * speed)
    },
    HOLE_REACH
  )
}

/**
 * Writes a rotation into the air around a point, so the flow sweeps things round rather than outward. The
 * direction at each cell is the offset turned a quarter turn, which is what makes a circle instead of a blast.
 */
export function swirl(grid: Grid, cx: number, cy: number, radius: number): void {
  overDisc(
    grid,
    cx,
    cy,
    radius,
    (index, dx, dy, falloff, distance) => {
      if (distance === 0) return
      // Perpendicular to the line out from the middle: (dx, dy) turned ninety degrees.
      const speed = TURBINE_SWIRL * falloff
      pushAir(grid, index, (-dy / distance) * speed, (dx / distance) * speed)
    },
    radius
  )
}

/** How far out a burst looks for somewhere to put each trail before giving up on that direction. */
const BURST_REACH = 4

/**
 * Throws a spray of trails out from a point: one cell each, placed in the first open space along its own
 * direction and handed a speed outward.
 *
 * Deliberately not `impulse`. A blast shoves whatever is already there, which in open sky is nothing at all —
 * a firework needs to *make* the things that fly, and it needs them to leave from one point along separate
 * lines. Each trail is an ordinary cell with a lifetime, so it fades on its own and the draught curls it on
 * the way out.
 */
export function scatter(
  grid: Grid,
  rng: Rng,
  cx: number,
  cy: number,
  sparks: number,
  speed: number,
  product: MaterialId
): void {
  // One turn of the circle divided between them, jittered, so it reads as a spray rather than a cartwheel.
  const offset = rng.next() * Math.PI * 2
  for (let spark = 0; spark < sparks; spark++) {
    const angle = offset + ((spark + rng.next() * 0.6) / sparks) * Math.PI * 2
    const ux = Math.cos(angle)
    const uy = Math.sin(angle)

    for (let step = 1; step <= BURST_REACH; step++) {
      const x = Math.round(cx + ux * step)
      const y = Math.round(cy + uy * step)
      if (x < 0 || x >= grid.width || y < 0 || y >= grid.height) break

      const index = cellIndex(grid, x, y)
      // A wall stops the spark. Loose material does not: a firework that goes off buried in its own pan has
      // to be able to throw sparks out through the kernels, or bursting inside anything produces nothing.
      // Walking on past a wall is how a firework going off beside a divider landed embers in the next stall
      // and lit the fuse there early.
      const found = grid.material[index]
      if (found !== MaterialId.empty && !isMovable(found)) break
      if (found !== MaterialId.empty) continue

      placeMaterial(grid, index, product)
      push(grid, index, ux * speed, uy * speed)
      break
    }
  }
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
    // Into the air first: the tool blows a draught, and the draught is what carries things. It keeps
    // working after the pointer stops, and it bends around whatever is in the way.
    pushAir(grid, index, ux * WIND_AIR * falloff, uy * WIND_AIR * falloff)

    if (!isMovable(grid.material[index])) return
    const speed = WIND_STRENGTH * falloff * massFactor(grid.material[index])
    push(grid, index, ux * speed, uy * speed)
  })
}

/** Raises or lowers the temperature under the brush, for melting and freezing without painting. */
export function temper(grid: Grid, cx: number, cy: number, radius: number, warming: boolean): void {
  const direction = warming ? 1 : -1

  overDisc(grid, cx, cy, radius, (index, _dx, _dy, falloff) => {
    const current = grid.temperature[index]
    const extreme = Math.abs(current - AMBIENT_TEMPERATURE)
    const step = (TEMPERATURE_STEP + extreme * TEMPERATURE_PULL) * falloff * direction
    const next = current + step
    grid.temperature[index] = Math.round(
      Math.max(TEMPERATURE_LIMITS.floor, Math.min(TEMPERATURE_LIMITS.ceiling, next))
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
  heat: number,
  minReach = MIN_REACH
): void {
  overDisc(
    grid,
    cx,
    cy,
    radius,
    (index, dx, dy, falloff, distance) => {
      if (heat > 0) {
        // Written as a floor rather than added, so overlapping blasts don't stack into a fake sun.
        const pulse = Math.round(heat * falloff)
        if (grid.temperature[index] < pulse) grid.temperature[index] = pulse
      }

      if (!isMovable(grid.material[index])) return

      const thrown = strength * massFactor(grid.material[index])
      // The cell at the centre has no direction to go, so it takes the shove straight up.
      if (distance === 0) {
        push(grid, index, 0, -thrown)
        return
      }

      const speed = thrown * falloff
      push(grid, index, (dx / distance) * speed, (dy / distance) * speed)
    },
    minReach
  )

  // The draught, over a much wider disc than the blast itself: this is what curls debris around and drags
  // smoke outward instead of leaving a still world with things flying through it.
  if (strength > 0) {
    const gustReach = Math.max(minReach, Math.floor(radius)) * AIR_REACH
    overDisc(
      grid,
      cx,
      cy,
      gustReach,
      (index, dx, dy, falloff, distance) => {
        if (distance === 0) return
        const gust = strength * AIR_SHARE * falloff
        pushAir(grid, index, (dx / distance) * gust, (dy / distance) * gust)
      },
      gustReach
    )
  }

  // The rows the blast reached, woken once between them rather than once per cell.
  if (heat > 0) {
    const reach = Math.max(minReach, Math.floor(radius))
    markHotRowBand(grid, cy - reach, cy + reach)
  }
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
 *
 * Every charge blasts in full, including the ones going off inside another blast. That looks wasteful in a
 * packed field, and skipping them is much faster, but the overlapping impulses are the launch: it is what
 * makes a deep slab throw a sand bed instead of just scorching it.
 */
export function detonate(grid: Grid, index: number, x: number, y: number): void {
  const charge = MATERIALS[grid.material[index]].explodes
  if (charge === undefined) return

  transformCell(grid, index, charge.into)
  grid.temperature[index] = charge.heat
  markHotRow(grid, index)

  impulse(grid, x, y, charge.radius, charge.impulse, charge.heat)
}
