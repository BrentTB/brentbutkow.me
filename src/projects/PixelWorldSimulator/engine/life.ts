import { AntHeading, Grid, Life, MaterialBehavior, MaterialId, Medium } from '../pixel-world.types'
import { cellIndex, markHotRow, placeMaterial, swapCells, transformCell } from './grid'
import { ANT_TUNNELS, MATERIALS } from './materials'
import { NEIGHBOURS, pickNeighbour } from './neighbours'
import { Rng } from './rng'

/** Energy per tick a creature loses outside its own medium. A fish in the air is on a short clock. */
const STRANDED_DRAIN = 3
/** Chance per tick that a stranded creature is dragged downward, so a fish out of water falls back in. */
const STRANDED_FALL = 0.5
/** Chance per tick a stranded creature thrashes sideways. It is dying, not set in concrete. */
const STRUGGLE = 0.35
/** The most energy a cell's `data` byte can hold. */
const MAX_ENERGY = 255
/** Energy a plant keeps however hard it is grazed, so a pasture always has something to grow back from. */
const GRAZE_FLOOR = 24
/** How many neighbours of its own kind a producer tolerates before it stops dividing. */
const CROWDED = 1
/** What a producer spends to put out a new cell. Its own energy came from light, so it is a cost, not a half. */
const SPLIT_COST = 12

/**
 * How often a hunter looks around, and how coarsely. Sight is by far the most expensive thing in the pass:
 * a bird with a range of 18 reads thirteen hundred cells, and a flock of a thousand of them costs more per
 * tick than everything else in the sim put together. Looking every fourth tick, at every second cell, is
 * sixteen times cheaper and still finds anything bigger than a single cell within a few ticks.
 */
const SCAN_CHANCE = 0.25
const SCAN_STEP = 2
/** Close enough to stop looking: it is already next to something worth chasing. */
const CLOSE_ENOUGH = 9

// Which ids are alive, and their config, as flat lookups: the pass asks this of every cell it visits.
const LIFE = MATERIALS.map((material) => material.life)
const IS_ALIVE = new Uint8Array(MATERIALS.map((material) => (material.life === undefined ? 0 : 1)))
/**
 * Who eats what, as a flat table indexed `species * count + material`. The diet was an array, and
 * `includes` on it ran once per neighbour and once per cell of every hunter's sight.
 */
const EATS = new Uint8Array(MATERIALS.length * MATERIALS.length)
for (const material of MATERIALS) {
  for (const food of material.life?.diet ?? []) EATS[material.id * MATERIALS.length + food] = 1
}

/** Whether this species eats that material. */
function eats(species: number, material: number): boolean {
  return EATS[species * MATERIALS.length + material] === 1
}

/**
 * Creatures are single cells: the species is the `MaterialId` and the energy is the cell's `data` byte.
 * Everything below is the same four rules for every species, with the numbers coming from the material
 * table — move inside your medium, eat what is next to you, split when you are full, die at zero.
 *
 * A food chain falls out of that rather than being written down anywhere: algae lives on light, fish eat
 * algae, birds eat fish, everything dies into meat, and bugs eat the meat.
 */
export function simulateLife(grid: Grid, rng: Rng, tick: number): void {
  const { width, height, material, moved } = grid
  if (grid.heading.size > 0) pruneAntHeadings(grid)
  // The x direction alternates with tick parity, and anything that moves is marked. Without both, a
  // creature that steps into a cell the scan has not reached yet gets a second turn in the same tick, and
  // a crowd of them drifts: a blob of birds slid steadily left across an empty world.
  const leftToRight = tick % 2 === 0

  for (let y = height - 1; y >= 0; y--) {
    for (let i = 0; i < width; i++) {
      const x = leftToRight ? i : width - 1 - i
      const index = y * width + x
      const id = material[index]
      if (IS_ALIVE[id] === 0 || moved[index]) continue

      const life = LIFE[id]
      if (life === undefined) continue

      // Ants run their own rules: they dig and steer instead of drifting, so they never touch the
      // grazer path below.
      if (id === MaterialId.ant) {
        stepAnt(grid, rng, x, y, index, life)
        continue
      }

      if (!spendEnergy(grid, index, life, rng)) continue
      if (eat(grid, rng, x, y, index, life)) continue
      if (breed(grid, rng, x, y, index, life)) continue

      if (!inMedium(grid, index, life)) {
        strand(grid, rng, x, y, index)
        continue
      }
      if (sink(grid, index, x, y, life)) continue
      // Death is handled where the energy is spent. Checking it here read the cell the creature had
      // just moved out of, so every step turned the water behind it into a corpse.
      if (rng.chance(life.moveChance)) roam(grid, rng, x, y, index, life)
    }
  }
}

/**
 * Runs the cell's metabolism. Algae gains from light instead of spending; everything else spends, and
 * spends much faster somewhere it cannot survive. False when the cell died doing it.
 */
function spendEnergy(grid: Grid, index: number, life: Life, rng: Rng): boolean {
  const stranded = !inMedium(grid, index, life)
  const energy = grid.data[index]

  if (stranded) {
    grid.data[index] = Math.max(0, energy - STRANDED_DRAIN)
  } else if (life.diet.length === 0) {
    if (rng.chance(life.light ?? 0)) grid.data[index] = Math.min(MAX_ENERGY, energy + 1)
  } else if (rng.chance(life.burnRate)) {
    grid.data[index] = energy - 1
  }

  if (grid.data[index] > 0) return true
  transformCell(grid, index, life.corpse)
  return false
}

/**
 * Whether this cell is somewhere its species can live, judged by what is *around* it. A creature stands in
 * the cell it occupies, so the water a fish is swimming in is in its neighbours, never underneath it.
 * Reading the cell's own material instead meant every creature counted as at home and nothing ever
 * drowned.
 */
function inMedium(grid: Grid, index: number, life: Life): boolean {
  const medium = life.medium
  if (medium === Medium.any) return true

  // Anything that lives in the same medium counts as that medium. A fish in the middle of a shoal, or
  // swimming into a patch of algae, is not stranded: it is surrounded by things that are themselves in
  // water. Counting only the bare medium suffocated packed patches from the inside, all at once.
  const neighbourly = (material: number) => LIFE[material]?.medium === medium

  if (medium === Medium.surface) {
    // Its own food counts as breathable: a bug that eats its way into a bank of grass buries itself, when
    // what should happen is that it tunnels through, grazing as it goes.
    const species = grid.material[index]
    const athome = (m: number) => isAir(m) || neighbourly(m) || eats(species, m)
    return standingOnSomething(grid, index) && touches(grid, index, athome)
  }

  const wants = medium === Medium.water ? isWater : medium === Medium.soil ? isSoil : isAir
  return touches(grid, index, (material) => wants(material) || neighbourly(material))
}

/** Whether any of the four neighbours satisfies `accepts`. */
function touches(grid: Grid, index: number, accepts: (material: number) => boolean): boolean {
  const x = index % grid.width
  const y = Math.floor(index / grid.width)

  for (const [dx, dy] of NEIGHBOURS) {
    const nx = x + dx
    const ny = y + dy
    if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) continue
    if (accepts(grid.material[cellIndex(grid, nx, ny)])) return true
  }
  return false
}

function isCreature(material: number): boolean {
  return IS_ALIVE[material] === 1
}

function isWater(material: number): boolean {
  return material === MaterialId.water || material === MaterialId.saltWater
}

function isAir(material: number): boolean {
  return material === MaterialId.empty
}

function isSoil(material: number): boolean {
  return (
    material === MaterialId.dirt ||
    material === MaterialId.sand ||
    material === MaterialId.mud ||
    material === MaterialId.gravel
  )
}

/** Something firm under the cell below: what makes a bug a walker rather than a floater. */
function standingOnSomething(grid: Grid, index: number): boolean {
  const below = index + grid.width
  if (below >= grid.material.length) return true

  const under = grid.material[below]
  if (under === MaterialId.empty || isCreature(under)) return false
  return MATERIALS[under].behavior !== MaterialBehavior.gas
}

/** Whether a creature of this species can move into a cell. */
function passable(grid: Grid, index: number, life: Life): boolean {
  const target = grid.material[index]
  if (isCreature(target)) return false

  switch (life.medium) {
    case Medium.water:
      return target === MaterialId.water || target === MaterialId.saltWater
    case Medium.air:
      return target === MaterialId.empty
    case Medium.soil:
      return isSoil(target)
    case Medium.surface:
      return target === MaterialId.empty
    case Medium.any:
      return loose(target) || MATERIALS[target].life !== undefined
  }
}

/**
 * Whether a step is allowed to go upward. Only things that live in the air may climb through it: a slime is
 * at home anywhere it can fit, which is not the same as being able to fly, and watching one stroll up
 * through empty space looked absurd.
 */
function canClimb(grid: Grid, target: number, life: Life): boolean {
  if (life.medium === Medium.air) return true
  return grid.material[target] !== MaterialId.empty
}

/**
 * Eats a neighbour if one is on the menu, leaving the eater's own medium behind. Water, for a fish, or a
 * hole in the pool appears every time something has lunch.
 */
function eat(grid: Grid, rng: Rng, x: number, y: number, index: number, life: Life): boolean {
  if (life.diet.length === 0) return false
  // Full creatures leave the rest for later, and nothing eats faster than its own appetite.
  if (grid.data[index] >= life.breedAt) return false
  if (!rng.chance(life.feedChance)) return false

  const species = grid.material[index]
  const start = Math.floor(rng.next() * NEIGHBOURS.length)
  const meal = pickNeighbour(grid, x, y, (material) => eats(species, material), start)
  if (meal < 0) return false

  // A bite, not a swallow. Living food loses energy and dies only when there is nothing left in it, so a
  // patch of algae is a pasture that grows back rather than a cell that vanishes whole. Eating cells
  // outright turned every grazer into a strip miner: the crop went to zero and then everything starved.
  const prey = LIFE[grid.material[meal]]
  // Living food keeps a reserve: grazing cannot take the last of a plant, which is what stops a pasture
  // being eaten out of existence. Without a floor the crop reaches zero and then everything starves,
  // however carefully the rest is tuned — prey needs somewhere to survive a bad season.
  // The reserve is a plant's, not an animal's: applied to everything, a predator could only nibble prey
  // down to the floor and never finish it, so nothing ever actually killed anything.
  const isPlant = prey !== undefined && prey.diet.length === 0
  const available =
    prey === undefined ? life.nutrition : grid.data[meal] - (isPlant ? GRAZE_FLOOR : 0)
  if (available <= 0) return false

  const taken = Math.min(available, life.nutrition)

  if (prey === undefined) {
    transformCell(grid, meal, life.medium === Medium.water ? MaterialId.water : MaterialId.empty)
  } else {
    grid.data[meal] -= taken
    if (grid.data[meal] === 0) {
      transformCell(grid, meal, life.medium === Medium.water ? MaterialId.water : MaterialId.empty)
    }
  }

  grid.data[index] = Math.min(MAX_ENERGY, grid.data[index] + taken)
  return true
}

/** Splits a full cell in two, half the energy each, into any neighbouring cell it could live in. */
function breed(grid: Grid, rng: Rng, x: number, y: number, index: number, life: Life): boolean {
  const energy = grid.data[index]
  if (energy < life.breedAt) return false
  if (!rng.chance(life.breedChance)) return false

  const start = Math.floor(rng.next() * NEIGHBOURS.length)
  const room = pickNeighbour(
    grid,
    x,
    y,
    () => true,
    start,
    (candidate) => passable(grid, candidate, life)
  )
  if (room < 0) return false

  // An animal halves what it has, because that energy came from food it ate. A producer pays a fixed cost
  // and keeps the rest, because its energy comes from light: halving it made every split take twice as
  // long as the last, so a patch of algae could never keep pace with anything grazing on it.
  const produces = life.diet.length === 0
  // A producer keeps its patch lacy rather than paving the water: past a couple of neighbours of its own,
  // it stops dividing. A rate alone gives a solid mat, the same way vines needed a crowding rule.
  if (produces && ownNeighbours(grid, x, y) > CROWDED) return false
  const child = produces ? life.startEnergy : Math.floor(energy / 2)
  const kept = produces ? energy - SPLIT_COST : energy - child

  placeMaterial(grid, room, grid.material[index] as MaterialId)
  // A newborn waits for the next tick, like everything else that has already been dealt with.
  grid.moved[room] = 1
  grid.data[room] = child
  grid.data[index] = Math.max(1, kept)
  return true
}

/** Where a burrower prefers to go: upward, so it works the topsoil rather than sinking out of sight. */
const SURFACING: readonly (readonly [number, number])[] = [
  [0, -1],
  [0, -1],
  [-1, 0],
  [1, 0],
  [0, 1],
]

/**
 * A step through its own medium, biased toward whatever it eats when it can see some. The bias is the
 * whole reason a bird reads as hunting rather than as drifting.
 */
function roam(grid: Grid, rng: Rng, x: number, y: number, index: number, life: Life): void {
  // Only look for food while there is room for a meal. A full creature scanning its whole range every tick
  // is the most expensive thing in the pass and buys nothing.
  // Looking around is rationed: see SCAN_CHANCE.
  const hungry = grid.data[index] < life.breedAt
  const looks = life.hunts !== undefined && hungry && rng.chance(SCAN_CHANCE)
  const toward = looks ? sightOf(grid, x, y, index, life) : null

  if (toward !== null) {
    const stepped = tryStep(grid, index, x, y, toward.dx, toward.dy, life)
    if (stepped) return
  }

  // A burrower drifts upward on purpose. Left to a plain random walk a worm sinks away from the surface,
  // out of reach of anything that eats worms, and a bank of them starves the birds standing over it.
  const directions = life.medium === Medium.soil ? SURFACING : NEIGHBOURS
  const start = Math.floor(rng.next() * directions.length)
  for (let step = 0; step < directions.length; step++) {
    const [dx, dy] = directions[(start + step) % directions.length]
    if (tryStep(grid, index, x, y, dx, dy, life)) return
  }
}

/** One cell of movement, if the target is somewhere this species can be. */
function tryStep(
  grid: Grid,
  index: number,
  x: number,
  y: number,
  dx: number,
  dy: number,
  life: Life
): boolean {
  const nx = x + dx
  const ny = y + dy
  if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) return false

  const target = cellIndex(grid, nx, ny)
  if (!passable(grid, target, life)) return false
  if (dy < 0 && !canClimb(grid, target, life)) return false

  // A surface walker has to keep something underfoot, or it walks off the edge of its own world.
  if (life.medium === Medium.surface && !standingOnSomething(grid, target)) return false

  swapCells(grid, index, target)
  grid.moved[index] = 1
  grid.moved[target] = 1
  return true
}

/** How many of the four neighbours are the same species as this cell. */
function ownNeighbours(grid: Grid, x: number, y: number): number {
  const species = grid.material[cellIndex(grid, x, y)]
  let total = 0

  for (const [dx, dy] of NEIGHBOURS) {
    const nx = x + dx
    const ny = y + dy
    if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) continue
    if (grid.material[cellIndex(grid, nx, ny)] === species) total++
  }
  return total
}

/** The direction of the nearest thing on the menu, or null when nothing is in range. */
function sightOf(
  grid: Grid,
  x: number,
  y: number,
  index: number,
  life: Life
): { dx: number; dy: number } | null {
  const reach = life.hunts ?? 0
  const species = grid.material[index]
  const top = Math.max(0, y - reach)
  const bottom = Math.min(grid.height - 1, y + reach)
  const leftmost = Math.max(0, x - reach)
  const rightmost = Math.min(grid.width - 1, x + reach)

  let best = -1
  let towardX = 0
  let towardY = 0

  // Rows and columns are walked in strides, and the bounds are clamped once rather than tested per cell.
  for (let ny = top; ny <= bottom; ny += SCAN_STEP) {
    const row = ny * grid.width
    for (let nx = leftmost; nx <= rightmost; nx += SCAN_STEP) {
      if (!eats(species, grid.material[row + nx])) continue

      const dx = nx - x
      const dy = ny - y
      const distance = dx * dx + dy * dy
      if (best >= 0 && distance >= best) continue

      best = distance
      towardX = Math.sign(dx)
      towardY = Math.sign(dy)
      // Something this close is worth chasing without reading the rest of the range.
      if (distance <= CLOSE_ENOUGH) return { dx: towardX, dy: towardY }
    }
  }

  return best < 0 ? null : { dx: towardX, dy: towardY }
}

/**
 * Out of its medium a creature falls and thrashes: a fish flapping on dry land drops back toward the water
 * and flops about while it does. Standing perfectly still made a stranded creature read as a solid block
 * rather than as something in trouble.
 */
function strand(grid: Grid, rng: Rng, x: number, y: number, index: number): void {
  if (y + 1 < grid.height && rng.chance(STRANDED_FALL)) {
    const below = cellIndex(grid, x, y + 1)
    if (loose(grid.material[below])) {
      swapCells(grid, index, below)
      grid.moved[index] = 1
      grid.moved[below] = 1
      return
    }
  }

  if (!rng.chance(STRUGGLE)) return

  // Sideways through anything loose, not just its own medium: it is trying to get out of where it is.
  const start = Math.floor(rng.next() * NEIGHBOURS.length)
  for (let step = 0; step < NEIGHBOURS.length; step++) {
    const [dx, dy] = NEIGHBOURS[(start + step) % NEIGHBOURS.length]
    if (dy < 0) continue
    const nx = x + dx
    const ny = y + dy
    if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) continue

    const target = cellIndex(grid, nx, ny)
    if (!loose(grid.material[target])) continue
    swapCells(grid, index, target)
    grid.moved[index] = 1
    grid.moved[target] = 1
    return
  }
}

/**
 * Pulls anything that cannot fly down through open air. A slime crossing a cave should fall into it, and
 * only a bird gets to hold its height.
 */
function sink(grid: Grid, index: number, x: number, y: number, life: Life): boolean {
  if (life.medium === Medium.air || y + 1 >= grid.height) return false

  const below = cellIndex(grid, x, y + 1)
  if (grid.material[below] !== MaterialId.empty) return false

  swapCells(grid, index, below)
  grid.moved[index] = 1
  grid.moved[below] = 1
  return true
}

/** Anything a struggling creature can shove itself through: air, gas, liquid, or loose grains. */
function loose(material: number): boolean {
  if (material === MaterialId.empty) return true
  const behavior = MATERIALS[material].behavior
  return behavior !== MaterialBehavior.static
}

// --- Ants -----------------------------------------------------------------------------------------
// An ant is the one creature that steers. Where a fish drifts and a bird chases, an ant holds a
// heading and digs along it, pushing wood aside as spoil rather than eating it, so a wall becomes a
// run of galleries. The heading lives in `grid.heading`; energy and everything else stays a creature's.

/** What an ant tunnels through, shouldering it aside instead of eating it, as a flat lookup. */
const DIGGABLE = new Uint8Array(MATERIALS.length)
for (const id of ANT_TUNNELS) DIGGABLE[id] = 1

/** Energy a dug cell costs on top of metabolism, so how far a colony reaches is paid for, not free. */
const DIG_COST = 1
/** Chance per move that an ant turns, which is what forks a straight run into a branching gallery. */
const ANT_BRANCH_CHANCE = 0.08

/** The eight steps an ant can take, cardinals and diagonals alike. */
const ANT_STEPS: readonly (readonly [number, number])[] = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
]

/**
 * The bearings a turning ant may pick, weighted by how often they come up: the four diagonals dominate
 * and the down-slanting pair most of all, with the straight cardinals a minority, so galleries mostly
 * run on the slant rather than in boxy right angles.
 */
const ANT_TURNS: readonly (readonly [number, number])[] = [
  [1, 1],
  [1, 1],
  [-1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
  [1, 0],
  [-1, 0],
  [0, 1],
]
/**
 * Chance a dug cell of wood leaves a grain of spoil behind. Kept low on purpose: most of the wood is
 * carried off out of sight, so a gallery reads as a hollow corridor with a little rubble at its mouth
 * rather than a cavity packed solid with debris.
 */
const SPOIL_CHANCE = 0.02

/**
 * One ant's turn: burn a little energy, grab any leaf within reach, and then either fall, dig, or walk
 * one cell along its heading. It never touches the grazer rules — digging and steering are its whole
 * character.
 */
function stepAnt(grid: Grid, rng: Rng, x: number, y: number, index: number, life: Life): void {
  if (rng.chance(life.burnRate) && grid.data[index] > 0) grid.data[index] -= 1
  if (grid.data[index] === 0) {
    grid.heading.delete(index)
    transformCell(grid, index, life.corpse)
    return
  }

  // Fuel up on a touching leaf, then, rarely, put out another worker where there is room for one.
  if (eat(grid, rng, x, y, index, life)) return
  if (breed(grid, rng, x, y, index, life)) return

  // Gravity, but an ant grips walls: it drops only when it is in open air with nothing solid to hold,
  // so one painted in the sky lands while one climbing a gallery keeps its place instead of falling
  // straight back into the cell it just dug up into.
  if (
    !standingOnSomething(grid, index) &&
    !clingsToWall(grid, x, y) &&
    y + 1 < grid.height &&
    grid.material[cellIndex(grid, x, y + 1)] === MaterialId.empty
  ) {
    const below = cellIndex(grid, x, y + 1)
    swapCells(grid, index, below)
    grid.moved[index] = 1
    grid.moved[below] = 1
    moveHeading(grid, index, below)
    return
  }

  if (!rng.chance(life.moveChance)) return

  let heading = grid.heading.get(index)
  if (heading === undefined) {
    heading = { hx: rng.chance(0.5) ? 1 : -1, hy: rng.chance(0.75) ? 1 : -1 }
    grid.heading.set(index, heading)
  }

  if (rng.chance(ANT_BRANCH_CHANCE)) turn(heading, rng)

  // Drive the heading: dig the cell ahead when it is wood, walk through it when it is already open
  // tunnel, and only peel onto a near direction when the way ahead is blocked. Following the heading
  // rather than digging whatever is nearest is what pushes a tunnel outward instead of chewing the wall
  // it is standing in into a widening blob.
  for (const [cdx, cdy] of antCandidates(heading.hx, heading.hy, rng)) {
    const moved = antAdvance(grid, rng, x, y, index, cdx, cdy)
    if (moved < 0) continue
    heading.hx = cdx
    heading.hy = cdy
    moveHeading(grid, index, moved)
    return
  }
}

/** Whether any neighbour is a solid wall an ant can grip, so it holds instead of dropping. */
function clingsToWall(grid: Grid, x: number, y: number): boolean {
  for (const [dx, dy] of NEIGHBOURS) {
    const nx = x + dx
    const ny = y + dy
    if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) continue
    if (MATERIALS[grid.material[cellIndex(grid, nx, ny)]].behavior === MaterialBehavior.static) {
      return true
    }
  }
  return false
}

/** Moves an ant's heading with it, if it has one. */
function moveHeading(grid: Grid, from: number, to: number): void {
  const heading = grid.heading.get(from)
  if (heading === undefined) return
  grid.heading.delete(from)
  grid.heading.set(to, heading)
}

/**
 * Picks a new bearing. Diagonals are favoured over the straight cardinals and downward over up, so a
 * colony fans out into slanting galleries. Never an exact about-face, which would just undig the tunnel
 * it came in on.
 */
function turn(heading: AntHeading, rng: Rng): void {
  const [hx, hy] = ANT_TURNS[Math.floor(rng.next() * ANT_TURNS.length)]
  if (hx === -heading.hx && hy === -heading.hy) return
  heading.hx = hx
  heading.hy = hy
}

/**
 * The eight steps ordered by how closely each matches the heading, nearest first, so an ant keeps going
 * the way it was pointed and only peels onto a turn when the way ahead is blocked. A little rng jitter
 * settles ties — the cardinal and the diagonal either side of it score the same — without swamping the
 * ordering, which is also why a cardinal heading drifts onto a diagonal about as often as it holds.
 */
function antCandidates(dx: number, dy: number, rng: Rng): (readonly [number, number])[] {
  return ANT_STEPS.map((step) => ({ step, score: step[0] * dx + step[1] * dy + rng.next() * 0.5 }))
    .sort((a, b) => b.score - a.score)
    .map((scored) => scored.step)
}

/**
 * Moves an ant one cell in a direction, returning where it ended up or -1 if that way is blocked. It
 * walks into open ground, digs through anything on the diggable list, and treats stone, metal and other
 * creatures as a wall.
 */
function antAdvance(
  grid: Grid,
  rng: Rng,
  x: number,
  y: number,
  index: number,
  dx: number,
  dy: number
): number {
  const nx = x + dx
  const ny = y + dy
  if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) return -1

  const target = cellIndex(grid, nx, ny)
  const there = grid.material[target]

  if (there === MaterialId.empty || loose(there)) {
    // Walk or swim through it. An ant left standing in open air is pulled down by the gravity step
    // before it ever reaches here, so there is no need to forbid a sideways step across a gap.
    swapCells(grid, index, target)
    grid.moved[index] = 1
    grid.moved[target] = 1
    return target
  }

  if (DIGGABLE[there] === 1) {
    dig(grid, rng, index, target, there)
    return target
  }

  return -1
}

/** Takes a diggable cell: charges the dig, heaps wood spoil where there is room, and steps in. */
function dig(grid: Grid, rng: Rng, index: number, target: number, material: number): void {
  grid.data[index] = Math.max(0, grid.data[index] - DIG_COST)

  // Wood occasionally leaves a grain of spoil; leaves are light enough to leave nothing.
  if (material === MaterialId.wood && rng.chance(SPOIL_CHANCE)) {
    const spot = spoilSpot(grid, rng, index)
    if (spot >= 0) {
      placeMaterial(grid, spot, MaterialId.gravel)
      grid.moved[spot] = 1
    }
  }

  carryAnt(grid, index, target)
}

/** An empty neighbour to drop spoil into, or -1 when the ant is boxed in and the dig just compacts. */
function spoilSpot(grid: Grid, rng: Rng, index: number): number {
  const x = index % grid.width
  const y = Math.floor(index / grid.width)
  const start = Math.floor(rng.next() * NEIGHBOURS.length)
  return pickNeighbour(grid, x, y, isAir, start)
}

/** Moves an ant cell to a new index with its energy and heat, leaving open tunnel behind. */
function carryAnt(grid: Grid, from: number, to: number): void {
  grid.material[to] = MaterialId.ant
  grid.data[to] = grid.data[from]
  grid.burn[to] = grid.burn[from]
  grid.temperature[to] = grid.temperature[from]

  grid.material[from] = MaterialId.empty
  grid.data[from] = 0
  grid.burn[from] = 0

  markHotRow(grid, from)
  markHotRow(grid, to)
  grid.moved[to] = 1
}

/** Drops heading entries whose cell has stopped being an ant, so a burnt or overpainted one leaks none. */
function pruneAntHeadings(grid: Grid): void {
  for (const index of grid.heading.keys()) {
    if (grid.material[index] !== MaterialId.ant) grid.heading.delete(index)
  }
}
