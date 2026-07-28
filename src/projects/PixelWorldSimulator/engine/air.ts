import { Grid, MaterialBehavior, MaterialId } from '../pixel-world.types'
import { AMBIENT_TEMPERATURE } from '../data'
import { MATERIALS, isBurning } from './materials'
import { isAirRowBandAwake, wakeAirChunk, wakeAirChunkOnce } from './chunks'
import { MIN_SPEED, isSupported, push } from './kinetic'

/**
 * How often the flow itself is recomputed, in ticks. The coupling to material runs every tick regardless —
 * that is what has to stay responsive — but the field it reads is smooth and slow, and nobody can see the
 * difference between a draught that evolves sixty times a second and one that evolves thirty.
 *
 * It is worth real time. On a world of loose powder over a lava pool the whole tick ran 10.1 ms idle and
 * 15.8 ms with the blast tool held, against 7.8 and 11.5 with no air at all — which put a frame right on the
 * edge of the 16.7 ms budget. Three of the four passes are the field; only `carry` has to be every tick.
 *
 * The three constants below are written per tick and raised to this power, so changing it keeps the flow
 * looking the same rather than quietly making every gust weaker and longer-lived.
 */
const AIR_FIELD_EVERY = 2
/**
 * Share of its speed a parcel of air keeps each tick. A gust has to die out on its own or the world ends up
 * permanently windy: at this rate a blast's draught is gone in about half a second.
 */
const AIR_DECAY = 0.96 ** AIR_FIELD_EVERY
/**
 * Share of the difference with its neighbours a cell takes on each tick. This is what turns a point source
 * into a plume rather than a single fast pixel, and what carries a draught around a corner.
 */
const AIR_SPREAD = 1 - (1 - 0.22) ** AIR_FIELD_EVERY
/**
 * Below this, in cells per tick, air is snapped to nothing. Without a floor the field decays asymptotically
 * and never reaches zero, so every cell it ever touched stays awake forever and chunk sleeping is dead.
 */
const AIR_MIN = 0.02
/** Bound on how fast air can move, so a chain of explosions cannot build a hurricane. */
export const AIR_MAX = 22
/**
 * Upward air per degree a cell is hotter than what sits directly above it. This is the whole of buoyancy:
 * a hot cell pushes air up, the relaxation below pulls air down somewhere else to replace it, and a fire
 * gets its own draught for free.
 */
const BUOYANCY = 0.006 * AIR_FIELD_EVERY
/** Cap on the draught one cell can raise, so a pool of lava does not launch what floats above it. */
const BUOYANCY_MAX = 0.5

/**
 * Where air can go. Open cells obviously, and gases, which are mostly air anyway. Everything else is a wall:
 * flow does not pass through stone, and it does not pass through water either, which is what lets a pool sit
 * under a gale without being blown out of its basin.
 */
const PERMEABLE = new Uint8Array(
  MATERIALS.map(({ id, behavior }) =>
    id === MaterialId.empty || behavior === MaterialBehavior.gas ? 1 : 0
  )
)

/**
 * What the flow throws about. Only the loose solids.
 *
 * Static materials are the world's scaffolding and liquids stay in their basin: a pool blown apart cell by
 * cell reads as a bug rather than as weather. **Gases are excluded too, and that one matters for speed as
 * much as for looks.** A gas already follows the flow through `airLean`, which biases the direction it
 * spreads, so handing it momentum as well puts every cell of a cloud into the kinetic map: a burning field
 * of methane took the movement pass from a fraction of a millisecond to 46 of them, and the gas stopped
 * obeying its own rules on the way.
 */
const DRIFTS = new Uint8Array(
  MATERIALS.map(({ id, behavior }) =>
    id !== MaterialId.empty &&
    behavior !== MaterialBehavior.static &&
    behavior !== MaterialBehavior.liquid &&
    behavior !== MaterialBehavior.gas
      ? 1
      : 0
  )
)

/**
 * How readily the flow moves each material, against sand as the yardstick. Air carries a puff of smoke away
 * and barely nudges gravel, and getting that spread right is most of what makes a draught believable.
 */
const AIR_REFERENCE_DENSITY = 60
const LIGHTNESS = new Float32Array(
  MATERIALS.map(({ density }) =>
    density <= 0 ? 1 : Math.max(0.15, Math.min(6, AIR_REFERENCE_DENSITY / density))
  )
)

/** Heat a cell holds of its own accord, which is what makes a flame raise a draught of its own. */
const SELF_HEAT = new Int16Array(MATERIALS.map((material) => material.selfHeat ?? 0))
const BURN_HEAT = new Int16Array(MATERIALS.map((material) => material.ignite?.heat ?? 0))

export function canAirEnter(material: number): boolean {
  return PERMEABLE[material] === 1
}

/**
 * The air pass: hot cells raise a draught, the flow spreads and roughly conserves itself, and it all leaks
 * away again. Nothing here reads how material is moving — only its temperature and whether it is a wall.
 *
 * **Material never pushes air.** That is the one rule keeping this stable. Air pushes material and explicit
 * sources push air (the wind tool, a detonation, heat), but a cell being shoved along writes nothing back
 * into the field. The spec flagged the two-way version as able to add energy without bound, and it can: any
 * disagreement between the passes about who owed whom momentum compounds every tick.
 */
export function simulateAir(grid: Grid, tick: number): void {
  // The field on its own clock; the coupling every tick, so a blast still throws things the instant it fires.
  if (tick % AIR_FIELD_EVERY === 0) {
    buoy(grid)
    spreadAir(grid)
    relax(grid)
  }
  carry(grid)
}

/**
 * Speed the flow has to reach, in cells per tick, before it can steer something already moving, or move a
 * gas. Low, because this is the case worth having: debris in the air curving through a draught is most of
 * what an explosion looks like.
 */
const AIR_GRAB = 1.2
/**
 * The much higher bar for tearing a **settled** cell loose. Ground has to stay ground: an updraught off a
 * lava pool is a couple of cells per tick, and at the lower bar it plucked the dirt above it into the air a
 * grain at a time, over and over, which reads as the world twitching rather than as heat rising. Only a real
 * gale — a blast, or the wind tool held on something — clears this.
 */
const AIR_LIFT = 12
/**
 * How fast a cell must already be going, in cells per tick, before a mere draught is allowed to steer it.
 *
 * The low bar exists for blast debris crossing the world at sixteen cells a tick, and a grain that has simply
 * come unstuck from a slope is not that. Without the distinction, the instant anything left the ground it
 * went weightless with respect to wind: dirt on the side of the volcano was picked up by the vent's
 * convection at a flow of five to ten, carried up and inward, dropped, and picked up again about twice a
 * tick — which is how loose dirt ended up climbing the cone and settling on the summit.
 */
const AIR_STEER_SPEED = 3
/**
 * Share of the difference between the flow and a cell's own speed that becomes momentum, per tick. Drag,
 * not teleportation: debris already flying gets steered, and it takes a real gust several ticks to get a
 * grain properly moving.
 */
const AIR_DRAG = 0.3
/** Share of the drag that may act against a cell's own motion, which is what bends a path rather than ending it. */
const AIR_BRAKE = 0.3

/**
 * How much of the gap to the flow may be applied. In full where it points the way the air is going, and at
 * `AIR_BRAKE` of it where it points back — so a draught steers debris that is already outrunning it, and
 * curves a trajectory instead of leaving it a clean parabola, without flattening the launch that threw it.
 * Applying the gap in full both ways measurably killed explosions; applying none of it backwards meant air
 * did nothing at all to the fast debris that makes up most of a blast.
 */
function toward(flow: number, own: number): number {
  const gap = flow - own
  if (Math.sign(gap) === Math.sign(flow)) return gap
  return gap * AIR_BRAKE
}

/**
 * The one place air touches material. Anything the flow is strong enough to grab is handed momentum through
 * the same kinetic map a blast writes into, scaled by how heavy it is — so a gust that tumbles ash barely
 * troubles gravel, and debris already in the air gets curved by the draught around it instead of tracing a
 * clean parabola.
 *
 * Settled ground is deliberately left alone: this only reaches cells the flow can already move, so a strong
 * enough wind erodes a heap from its surface rather than levitating the whole thing.
 */
function carry(grid: Grid): void {
  const { width, height, material, airX, airY } = grid

  for (let y = 0; y < height; y++) {
    if (!isAirRowBandAwake(grid, y)) continue
    for (let x = 0; x < width; x++) {
      const index = y * width + x
      const id = material[index]
      if (id === MaterialId.empty || DRIFTS[id] === 0) continue

      // A drifter is a loose solid, never a gas, so it holds no air of its own: the flow it sits in is the
      // flow in the open cells around it. Its own entry would read zero, which is every case this pass moves.
      let flowX = 0
      let flowY = 0
      let open = 0
      if (y > 0 && canAirEnter(material[index - width])) {
        flowX += airX[index - width]
        flowY += airY[index - width]
        open++
      }
      if (y < height - 1 && canAirEnter(material[index + width])) {
        flowX += airX[index + width]
        flowY += airY[index + width]
        open++
      }
      if (x > 0 && canAirEnter(material[index - 1])) {
        flowX += airX[index - 1]
        flowY += airY[index - 1]
        open++
      }
      if (x < width - 1 && canAirEnter(material[index + 1])) {
        flowX += airX[index + 1]
        flowY += airY[index + 1]
        open++
      }
      if (open === 0) continue
      flowX /= open
      flowY /= open

      const flow = Math.abs(flowX) + Math.abs(flowY)
      const motion = grid.velocity.get(index)
      // Travelling fast through open air, and any draught steers it — that is the case worth having, and it
      // is what curves blast debris. Propped on something, or barely moving, and it takes a gale.
      //
      // Support alone is not enough of a test. A grain that has come unstuck from a slope is unsupported for
      // a tick at a time, and at the low bar the vent's convection picked it straight back up, over and over.
      const speed = motion === undefined ? 0 : Math.abs(motion.vx) + Math.abs(motion.vy)
      const flying = speed >= AIR_STEER_SPEED && !isSupported(grid, index)
      if (flow < (flying ? AIR_GRAB : AIR_LIFT)) continue

      const pull = AIR_DRAG * LIGHTNESS[id]
      const gainX = toward(flowX, motion?.vx ?? 0) * pull
      const gainY = toward(flowY, motion?.vy ?? 0) * pull

      // Only take a cell on if the flow can actually shift it. Handing over less than the kinetic pass will
      // act on paralyses it instead: `step` leaves anything in the velocity map alone, so a grain grabbed too
      // gently stops falling without starting to fly.
      if (motion === undefined && Math.abs(gainX) + Math.abs(gainY) < MIN_SPEED) continue

      push(grid, index, gainX, gainY)
    }
  }
}

/**
 * Hot cells push the air above them upward, in place, before anything spreads.
 *
 * Driven by how much hotter a cell is **than the air above it**, not than room temperature. A parcel only
 * rises when what is over it is cooler, which is both the real mechanism and the thing that keeps this
 * bounded: measured against ambient instead, an explosion heats tens of thousands of cells at once and every
 * one of them pushes up, so the whole world develops a permanent updraught with nothing to balance it.
 * A gradient has to come from somewhere, so a uniformly hot region sits still and a flame plumes.
 */
function buoy(grid: Grid): void {
  const { width, height, material, temperature, burn, airY } = grid

  for (let y = 0; y < height; y++) {
    // Gated on the heat pass's own flags, not the air's. Buoyancy is a function of temperature, so it has to
    // run wherever there is heat — waiting for the air to be awake means a region where the draught had
    // already settled never raises a new one, and the air over a cooling crater stays dead.
    if (grid.hotRows[y] === 0) continue
    let lastWoken = -1
    for (let x = 0; x < width; x++) {
      const index = y * width + x
      // Air is the only thing with buoyancy. A hot wall does not rise, it drives the air above it.
      if (!canAirEnter(material[index])) continue

      // One figure per parcel, from whichever is hotter: the air itself, or a surface right underneath it.
      // A surface counts straight away rather than waiting on conduction, which is what gives a burning plank
      // a draught strong enough to carry its flames along it. Adding the two together instead makes that
      // draught roughly twice as strong, and a fire lit at one end of a plank is then whipped off the end
      // before it can light the next cell — three of the burning tests catch exactly that.
      let heat = temperature[index]
      const below = index + width
      if (y < height - 1 && !canAirEnter(material[below])) {
        const id = material[below]
        const source = isBurning(burn[below]) ? BURN_HEAT[id] : SELF_HEAT[id]
        heat = Math.max(heat, temperature[below], source)
      }

      const off = heat - AMBIENT_TEMPERATURE
      if (off === 0) continue

      // Warm air rises and cold air sinks, symmetrically, both measured against room temperature. Comparing
      // a cell against the one above it looks equivalent and is not: the cell below anything you chilled is
      // hotter than the cold cell above it, so cooling raised an updraught underneath itself. Measured, the
      // chill tool blew air upward harder than the heat tool did, which is as confusing as it sounds.
      const lift = Math.max(-BUOYANCY_MAX, Math.min(BUOYANCY_MAX, off * BUOYANCY))
      airY[index] = clamp(airY[index] - lift)
      lastWoken = wakeAirChunkOnce(grid, index, lastWoken)
    }
  }
}

/**
 * Blends each cell toward its neighbours, double-buffered so a flow spreads evenly rather than smearing
 * down-and-right, and leaks a share of everything away. Walls contribute nothing and take nothing.
 */
function spreadAir(grid: Grid): void {
  const { width, height, material, airX, airY, airXNext, airYNext } = grid

  for (let y = 0; y < height; y++) {
    // A sleeping band cannot hold moving air: the field only ever gains speed where something woke a chunk.
    if (!isAirRowBandAwake(grid, y)) {
      const from = y * width
      airXNext.fill(0, from, from + width)
      airYNext.fill(0, from, from + width)
      continue
    }
    let lastWoken = -1
    for (let x = 0; x < width; x++) {
      const index = y * width + x
      if (!canAirEnter(material[index])) {
        airXNext[index] = 0
        airYNext[index] = 0
        continue
      }

      let sumX = 0
      let sumY = 0
      let open = 0
      if (y > 0 && canAirEnter(material[index - width])) {
        sumX += airX[index - width]
        sumY += airY[index - width]
        open++
      }
      if (y < height - 1 && canAirEnter(material[index + width])) {
        sumX += airX[index + width]
        sumY += airY[index + width]
        open++
      }
      if (x > 0 && canAirEnter(material[index - 1])) {
        sumX += airX[index - 1]
        sumY += airY[index - 1]
        open++
      }
      if (x < width - 1 && canAirEnter(material[index + 1])) {
        sumX += airX[index + 1]
        sumY += airY[index + 1]
        open++
      }

      const ownX = airX[index]
      const ownY = airY[index]
      const blendX = open === 0 ? ownX : ownX + (sumX / open - ownX) * AIR_SPREAD
      const blendY = open === 0 ? ownY : ownY + (sumY / open - ownY) * AIR_SPREAD

      airXNext[index] = settle(blendX * AIR_DECAY)
      airYNext[index] = settle(blendY * AIR_DECAY)
      if (airXNext[index] !== 0 || airYNext[index] !== 0) {
        lastWoken = wakeAirChunkOnce(grid, index, lastWoken)
      }
    }
  }

  grid.airX = airXNext
  grid.airY = airYNext
  grid.airXNext = airX
  grid.airYNext = airY
}

/**
 * Pushes the flow toward conserving itself: air piling into a cell has to come out of its neighbours, which
 * is what makes a column of rising air pull air down at the sides instead of appearing out of nowhere. One
 * pass of it, not a real pressure solve — the goal is a plume that reads right, not a fluid simulation.
 */
function relax(grid: Grid): void {
  const { width, height, material, airX, airY } = grid

  for (let y = 1; y < height - 1; y++) {
    if (!isAirRowBandAwake(grid, y)) continue
    for (let x = 1; x < width - 1; x++) {
      const index = y * width + x
      if (!canAirEnter(material[index])) continue

      // How much more air is leaving this cell than arriving. Walls read as still air, which is what makes
      // flow bend along a surface rather than through it.
      const right = canAirEnter(material[index + 1]) ? airX[index + 1] : 0
      const left = canAirEnter(material[index - 1]) ? airX[index - 1] : 0
      const down = canAirEnter(material[index + width]) ? airY[index + width] : 0
      const up = canAirEnter(material[index - width]) ? airY[index - width] : 0

      const divergence = (right - left + down - up) * 0.5
      if (divergence === 0) continue

      // Take a quarter of the excess off each outgoing side, which is the cheapest correction that both
      // conserves and stays stable.
      const share = divergence * 0.25
      if (canAirEnter(material[index + 1])) airX[index + 1] = clamp(right - share)
      if (canAirEnter(material[index - 1])) airX[index - 1] = clamp(left + share)
      if (canAirEnter(material[index + width])) airY[index + width] = clamp(down - share)
      if (canAirEnter(material[index - width])) airY[index - width] = clamp(up + share)
    }
  }
}

function clamp(speed: number): number {
  return Math.max(-AIR_MAX, Math.min(AIR_MAX, speed))
}

/** Clamped, and snapped to nothing once it is too slow to see, so the field empties and chunks can sleep. */
function settle(speed: number): number {
  if (speed > -AIR_MIN && speed < AIR_MIN) return 0
  return clamp(speed)
}

/**
 * Which way the air is leaning here: -1, 0 or 1. Used by the gas rules to pick a direction to drift, so a
 * plume bends downwind without the flow having to be strong enough to throw anything.
 */
export function airLean(grid: Grid, index: number): number {
  const sideways = grid.airX[index]
  if (sideways > AIR_LEAN) return 1
  if (sideways < -AIR_LEAN) return -1
  return 0
}

/**
 * Sideways speed a gas needs before it stops drifting at random and follows the air instead. Far below what
 * it takes to throw a grain: this is a bias on a coin flip, not a force.
 */
const AIR_LEAN = 0.15

/** Hands a parcel of air some speed. The one way anything outside this file writes into the field. */
export function pushAir(grid: Grid, index: number, vx: number, vy: number): void {
  if (!canAirEnter(grid.material[index])) return
  grid.airX[index] = clamp(grid.airX[index] + vx)
  grid.airY[index] = clamp(grid.airY[index] + vy)
  wakeAirChunk(grid, index)
}
