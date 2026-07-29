import { Grid, MaterialBehavior, MaterialId } from '../pixel-world.types'
import { AMBIENT_TEMPERATURE, TEMPERATURE_LIMITS } from '../data'
import { cellIndex, markHotRow, markHotRowBand, placeMaterial, transformCell } from './grid'
import { MATERIALS, isMovable } from './materials'
import { push } from './kinetic'
import { Rng } from './rng'
import { pushAir } from './air'

/**
 * Cells per tick a blast writes at the centre. Deliberately violent: this is the tool people reach for to
 * throw a heap of gravel across the world.
 */
const BLAST_STRENGTH = 9
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
 * Whether a cell of this material is worth aiming a blast at: something a throw would visibly move. Charges are
 * out because they are about to stop existing, and gases are out because a puff of smoke flying across the
 * world is not something anybody watches. Air and walls are out already, being immovable.
 */
const WORTH_THROWING = new Uint8Array(
  MATERIALS.map(({ id, behavior, explodes }) =>
    isMovable(id) && behavior !== MaterialBehavior.gas && explodes === undefined ? 1 : 0
  )
)

/**
 * Whether none of the eight cells around this one is worth throwing.
 *
 * Asking what there is to throw, rather than the tempting "are all my neighbours charges", is the point. A charge
 * only goes off because heat reached it, so the neighbour that lit it has already gone off and reads as spent:
 * every charge in a chain has a spent neighbour, and a test on charges is false essentially always.
 */
function nothingToThrowBeside(grid: Grid, x: number, y: number): boolean {
  if (x < 1 || y < 1 || x >= grid.width - 1 || y >= grid.height - 1) return false

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue
      if (WORTH_THROWING[grid.material[cellIndex(grid, x + dx, y + dy)]] === 1) return false
    }
  }
  return true
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

/**
 * Pulls every loose cell straight toward the centre — direction only, so a cell far out is still yanked in
 * rather than left to twitch. The black hole is the only thing that does this now: the attract tool it was
 * shared with is gone, having never been much fun to use.
 */
function pullInward(grid: Grid, cx: number, cy: number, radius: number, strength: number): void {
  overDisc(grid, cx, cy, radius, (index, dx, dy, falloff, distance) => {
    if (!isMovable(grid.material[index]) || distance === 0) return
    const speed = strength * falloff * massFactor(grid.material[index])
    push(grid, index, (-dx / distance) * speed, (-dy / distance) * speed)
  })
}

/** How far a black hole reaches, and how hard. A grab rather than a nudge. */
const HOLE_REACH = 18
const HOLE_STRENGTH = 6

/**
 * Pulls everything loose inward. Eating what arrives is the caller's job, and it matters: a puller that only
 * pulls is a permanent orbit machine, so the kinetic map never empties and nothing ever settles — which is
 * the exact shape of the performance problem the explosion work went in to fix.
 */
export function swallow(grid: Grid, cx: number, cy: number): void {
  pullInward(grid, cx, cy, HOLE_REACH, HOLE_STRENGTH)
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
  minReach = MIN_REACH,
  /**
   * Whether to stir the air as well. The draught is the expensive half of a blast by a wide margin — it walks a
   * disc three times the radius, so nine times the cells — and it is the half worth dropping for a charge with
   * nothing but other charges around it.
   */
  gust = true
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
  if (gust && strength > 0) {
    const gustReach = Math.max(minReach, Math.floor(radius)) * AIR_REACH
    overDisc(
      grid,
      cx,
      cy,
      gustReach,
      (index, dx, dy, falloff, distance) => {
        if (distance === 0) return
        const push = strength * AIR_SHARE * falloff
        pushAir(grid, index, (dx / distance) * push, (dy / distance) * push)
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
 * A charge walled in by other charges skips the wide air draught. The draught's job is curling loose debris and
 * smoke around the blast, and there is none of that deep inside a packed mass — every cell it would stir is
 * another charge about to stop existing or buried solid, so it buys nothing anybody can see and costs what a
 * surface charge costs. Half a screen of gunpowder is almost all interior, which is why it crawled.
 *
 * The material throw and heat pulse still fire either way, and that part is not optional. Skipping enclosed
 * charges outright is faster again and was tried and rejected: a deep slab then stops launching the bed above
 * it, because the launch is many overlapping throws rather than the one at the top. Dropping only the draught
 * keeps the overlap and gives up nothing but air nobody would have felt.
 */
export function detonate(grid: Grid, index: number, x: number, y: number): void {
  const charge = MATERIALS[grid.material[index]].explodes
  if (charge === undefined) return

  // Asked before the cell is spent, or it would count itself out of its own neighbourhood.
  const packed = nothingToThrowBeside(grid, x, y)

  transformCell(grid, index, charge.into)
  grid.temperature[index] = charge.heat
  markHotRow(grid, index)

  // Full throw and full heat pulse either way. Only the draught goes.
  impulse(grid, x, y, charge.radius, charge.impulse, charge.heat, MIN_REACH, !packed)
}
