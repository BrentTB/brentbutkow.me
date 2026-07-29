import { Grid, MaterialId } from '../pixel-world.types'
import { cellIndex, clearGrid, placeMaterial } from './grid'
import { Rng } from './rng'

export const Preset = {
  aquarium: 'aquarium',
  wild: 'wild',
  volcano: 'volcano',
  antColony: 'antColony',
  kitchen: 'kitchen',
  madScience: 'madScience',
} as const
export type Preset = (typeof Preset)[keyof typeof Preset]

/**
 * How far above the mountainside a cave tunnel keeps cutting, so the mouth comes out as a hole in the face
 * rather than stopping a cell short and leaving a skin of rock across it.
 */
const CAVE_MOUTH_CLEARANCE = 4

/** Fills a rectangle, inclusive of both corners and clipped to the grid. */
function fill(
  grid: Grid,
  left: number,
  top: number,
  right: number,
  bottom: number,
  material: MaterialId
) {
  for (let y = Math.max(0, top); y <= Math.min(grid.height - 1, bottom); y++) {
    for (let x = Math.max(0, left); x <= Math.min(grid.width - 1, right); x++) {
      placeMaterial(grid, cellIndex(grid, x, y), material)
    }
  }
}

function put(grid: Grid, x: number, y: number, material: MaterialId): void {
  if (x < 0 || x >= grid.width || y < 0 || y >= grid.height) return
  placeMaterial(grid, cellIndex(grid, x, y), material)
}

/**
 * A one-cell arc from `left` to `right`, both ends resting on `edge` and the middle `rise` cells above it.
 *
 * Each column fills the run between its own height and the previous column's, so where the curve steps the
 * two cells share an edge instead of only touching at a corner. Drawn a cell per column, a lid this shallow
 * comes out as a dotted diagonal with gaps a grain can pass straight through.
 */
function dome(grid: Grid, left: number, right: number, edge: number, rise: number): void {
  fill(grid, left, edge, right + 1, edge, MaterialId.metal)

  const span = right - left
  if (span <= 0) return

  const heightAt = (x: number) => edge - Math.round(rise * Math.sin((Math.PI * (x - left)) / span))

  let previous = heightAt(left)
  for (let x = left; x <= right; x++) {
    const here = heightAt(x)
    fill(grid, x, Math.min(here, previous), x, Math.max(here, previous), MaterialId.metal)
    previous = here
  }
}

/**
 * A vault: a hollow room with straight side walls carrying a barrel arch, standing on `floorY`. The walls run
 * from `spring` down to the floor and the arch springs from there, so the span sets how tall the arch is.
 *
 * A wobbled ellipse was the first attempt and reads as a badly drawn circle rather than as a room somebody
 * built: what makes a vault a vault is the straight wall meeting the curve at a definite line.
 */
function vaultRoom(
  grid: Grid,
  left: number,
  right: number,
  floorY: number,
  spring: number,
  thick: number,
  wall: MaterialId
): void {
  // Struck off the walls' inner faces rather than off the full span, so the curve meets the wall flush at the
  // spring line. Off the full span the arch is `thick` wider than the room below it and leaves a ledge running
  // right round the vault at the springing.
  const radius = (right - left) / 2 - thick
  const middle = (left + right) / 2
  const crownAt = (x: number) =>
    spring - Math.round(Math.sqrt(Math.max(0, radius * radius - (x - middle) ** 2)))

  fill(grid, left, crownAt(middle) - thick, right, floorY, MaterialId.empty)
  fill(grid, left, spring, left + thick - 1, floorY, wall)
  fill(grid, right - thick + 1, spring, right, floorY, wall)

  // Each column fills the run between its own crown and the last one's, so a steep part of the curve comes out
  // joined rather than as a stack of cells touching at their corners.
  let previous = crownAt(left)
  for (let x = left; x <= right; x++) {
    const here = crownAt(x)
    fill(grid, x, Math.min(here, previous) - thick + 1, x, Math.max(here, previous), wall)
    previous = here
  }
}

/**
 * Stamps a small picture, one character of `art` to a cell, through a legend of what each character means.
 * A character the legend does not mention leaves the cell as it is, which is how a sign gets a shape that
 * is not a rectangle.
 */
function stamp(
  grid: Grid,
  left: number,
  top: number,
  art: readonly string[],
  legend: Readonly<Record<string, MaterialId>>
): void {
  art.forEach((row, dy) => {
    for (let dx = 0; dx < row.length; dx++) {
      const material = legend[row[dx]]
      if (material !== undefined) put(grid, left + dx, top + dy, material)
    }
  })
}

/**
 * A run of surface heights: two slow waves plus a little jitter. Dead straight lines are what make a built
 * world look built, and a couple of sines is the cheapest way to stop that.
 */
function surfaceLine(width: number, base: number, swell: number, rng: Rng): number[] {
  const phase = rng.next() * Math.PI * 2
  const second = rng.next() * Math.PI * 2

  return Array.from({ length: width }, (_, x) => {
    const slow = Math.sin(phase + (x / width) * Math.PI * 3) * swell
    const fast = Math.sin(second + (x / width) * Math.PI * 11) * (swell * 0.35)
    const grain = rng.next() < 0.25 ? 1 : 0
    return Math.round(base + slow + fast + grain)
  })
}

/** A rough blob, wider than it is tall, for rocks and boulders. */
function boulder(
  grid: Grid,
  cx: number,
  cy: number,
  radius: number,
  rng: Rng,
  material: MaterialId
): void {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius - 1; dx <= radius + 1; dx++) {
      const reach = (dx * dx) / ((radius + 1) * (radius + 1)) + (dy * dy) / (radius * radius)
      if (reach > 1 + (rng.next() - 0.5) * 0.4) continue
      put(grid, cx + dx, cy + dy, material)
    }
  }
}

/**
 * A trunk of wood with a ragged canopy of plant over it. `girth` is how many cells thick the trunk is at the
 * foot: one for a sapling, more for something an ant can work a gallery into, tapering as it rises so it
 * reads as a tree rather than a post.
 */
function tree(grid: Grid, x: number, groundY: number, height: number, rng: Rng, girth = 1): void {
  for (let i = 0; i < height; i++) {
    // Thick at the base, thinning toward the crown, and never below one cell.
    const taper = Math.max(1, Math.round(girth * (1 - (i / height) * 0.65)))
    const from = x - Math.floor((taper - 1) / 2)
    for (let w = 0; w < taper; w++) put(grid, from + w, groundY - i, MaterialId.wood)
    // A slight lean near the top, so no two trees look stamped from the same mould.
    if (i > height * 0.6 && rng.next() < 0.4) put(grid, from + taper, groundY - i, MaterialId.wood)
  }

  const crown = groundY - height
  const spread = Math.max(2, Math.round(height * 0.45))
  for (let dy = -spread; dy <= spread; dy++) {
    for (let dx = -spread - 1; dx <= spread + 1; dx++) {
      const reach = (dx * dx) / ((spread + 1) * (spread + 1)) + (dy * dy) / (spread * spread)
      if (reach > 1 - rng.next() * 0.35) continue
      put(grid, x + dx, crown + dy, MaterialId.plant)
    }
  }
}

/**
 * Carves a thin wandering channel of air, drifting roughly in one direction. Lava tributaries off the vent
 * and the tunnels that let slimes out of their caves are both this: a crack for something to seep along.
 * `stopAbove` ends the channel when it climbs above a surface row, so a cave tunnel breaks out to daylight
 * without carving open sky.
 */
function vein(
  grid: Grid,
  x: number,
  y: number,
  dx: number,
  dy: number,
  length: number,
  rng: Rng,
  options: {
    stopAbove?: (col: number) => number
    branch?: number
    depth?: number
    /**
     * How many cells across the channel is cut. One is a crack for lava to seep along; a tunnel something
     * has to walk out of needs two or three, because a one-cell winding passage is a dead end to anything
     * that cannot climb through open air.
     */
    bore?: number
  } = {}
): void {
  const { stopAbove, branch = 0, depth = 0, bore = 1 } = options
  let cx = x
  let cy = y
  for (let i = 0; i < length; i++) {
    if (cx < 0 || cx >= grid.width || cy < 0 || cy >= grid.height) return
    if (stopAbove !== undefined && cy < stopAbove(cx)) return

    // Cut across the direction of travel, so a wide channel stays wide around its corners rather than
    // pinching to a single cell wherever it turns.
    const across = Math.abs(dx) >= Math.abs(dy)
    for (let step = 0; step < bore; step++) {
      const offset = step - Math.floor((bore - 1) / 2)
      put(grid, cx + (across ? 0 : offset), cy + (across ? offset : 0), MaterialId.empty)
    }
    if (rng.next() < 0.35) put(grid, cx, cy + 1, MaterialId.empty)

    // A tributary throws off side branches as it runs, so the network tangles and sprawls through the rock
    // instead of drawing one clean line. Depth is capped so it stays a tree of cracks, not an explosion.
    if (depth < 2 && i > 2 && rng.next() < branch) {
      const turn = rng.next() < 0.5 ? -1 : 1
      vein(grid, cx, cy, turn, rng.next() < 0.5 ? 1 : dy, Math.round(length * 0.6), rng, {
        stopAbove,
        branch: branch * 0.6,
        depth: depth + 1,
      })
    }

    // The wander bends the step rather than adding a move on top of it, so the head never travels more than
    // one cell per axis and the channel it cuts is always joined to itself. A second move stacked on the step
    // can jump the head two columns at once, and the cut either side of the jump does not meet — which reads
    // as a wall of rock straight across the tunnel, with the cave sealed off behind it.
    const bend = (step: number, chance: number) =>
      rng.next() < chance ? Math.max(-1, Math.min(1, step + (rng.next() < 0.5 ? 1 : -1))) : step

    const stepX = bend(dx, 0.4)
    let stepY = bend(dy, 0.3)
    // Something has to give, or the head sits still and the channel stops where it is.
    if (stepX === 0 && stepY === 0) stepY = dy === 0 ? -1 : dy

    cx += stepX
    cy += stepY
  }
}

/**
 * A tank of water with a bed of algae and a few fish: the food chain running on its own, without anyone
 * having to draw a tank first. Sized as a share of the grid so it fits whatever the world is.
 */
/** Stone below the bedrock line, dirt above it to the surface, with gravel seams where the two meet. */
function bedrockFloor(
  grid: Grid,
  ground: number[],
  rock: number[],
  rng: Rng,
  seams: readonly { chance: number; up: number }[]
): void {
  const { width, height } = grid
  for (let x = 0; x < width; x++) {
    fill(grid, x, rock[x], x, height - 1, MaterialId.stone)
    fill(grid, x, ground[x], x, rock[x] - 1, MaterialId.dirt)
    for (const seam of seams) {
      if (rng.next() < seam.chance) put(grid, x, rock[x] - seam.up, MaterialId.gravel)
    }
  }
}

/** A short ragged column of grass at one spot: one blade, sometimes two, rarely three. */
function grassTuft(grid: Grid, ground: number[], x: number, rng: Rng): void {
  const tufts = 1 + (rng.next() < 0.5 ? 1 : 0) + (rng.next() < 0.2 ? 1 : 0)
  for (let i = 0; i < tufts; i++) put(grid, x, ground[x] - i, MaterialId.plant)
}

function aquarium(grid: Grid, rng: Rng): void {
  const { width, height } = grid
  const left = Math.floor(width * 0.1)
  const right = width - left
  const floor = height - Math.floor(height * 0.06)
  const wall = Math.max(2, Math.floor(width * 0.01))
  const inLeft = left + wall + 1
  const inRight = right - wall - 1

  // Two chambers, one above the other. The lower one is the tank proper; the upper one is a shallow pool open
  // to the air, split off by an uneven stone shelf rather than a ruled line. `surface` is the lower tank's
  // waterline, which the reefs and fish below are all placed against.
  const topSurface = Math.floor(height * 0.12)
  const shelf = surfaceLine(width, Math.floor(height * 0.42), Math.max(2, height * 0.03), rng)
  const surface = Math.floor(height * 0.42) + 4

  fill(grid, left, floor, right, height - 1, MaterialId.stone)
  fill(grid, left, topSurface, left + wall, floor, MaterialId.stone)
  fill(grid, right - wall, topSurface, right, floor, MaterialId.stone)

  // The shelf: a stone divider that rises and falls across the tank, sealing the lower chamber. Each column
  // reaches at least as deep as its neighbours' tops, so a steep step in the line never leaves a diagonal gap
  // for the two pools to leak through.
  for (let x = inLeft; x <= inRight; x++) {
    const deepest = Math.max(shelf[x - 1] ?? shelf[x], shelf[x], shelf[x + 1] ?? shelf[x]) + 1
    fill(grid, x, shelf[x], x, deepest, MaterialId.stone)
  }

  // Water in both chambers. The top pool sits below its own surface, air above it; the bottom fills from just
  // under the shelf down to the sand.
  for (let x = inLeft; x <= inRight; x++) {
    // The top pool sits a few rows below the wall lip, so the vine creeping through it and the water finding
    // its level have somewhere to go without slopping over the top of the wall.
    fill(grid, x, topSurface + 5, x, shelf[x] - 1, MaterialId.water)
    fill(grid, x, shelf[x] + 2, x, floor - 1, MaterialId.water)
  }

  // A single vine in the top pool, anchored to a wall. Left to itself it creeps through the still water and
  // slowly fills the upper chamber, which is the whole point of leaving one up there.
  put(grid, inLeft + 1, topSurface + 5, MaterialId.vine)

  // A sand bed that rises and falls, with gravel showing through here and there.
  const bed = surfaceLine(width, floor - 3, Math.max(2, height * 0.02), rng)
  for (let x = left + wall + 1; x < right - wall; x++) {
    fill(grid, x, bed[x], x, floor - 1, MaterialId.sand)
    if (rng.next() < 0.12) put(grid, x, bed[x], MaterialId.gravel)
  }

  // Boulders of a few sizes, sunk into the sand rather than sitting on top of it in a row.
  const rocks = 3 + Math.floor(rng.next() * 3)
  for (let i = 0; i < rocks; i++) {
    const x = left + wall + 4 + Math.floor(rng.next() * Math.max(1, right - left - wall * 2 - 8))
    boulder(grid, x, bed[x] + 1, 2 + Math.floor(rng.next() * 3), rng, MaterialId.stone)
  }

  // Weed in clumps: algae only divides where it has room, so a solid row would sit there doing nothing.
  for (let x = left + wall + 3; x < right - wall - 3; x += 3 + Math.floor(rng.next() * 4)) {
    const clump = 1 + Math.floor(rng.next() * 3)
    for (let i = 0; i < clump; i++) put(grid, x, bed[x] - 1 - i * 2, MaterialId.algae)
  }

  // Terraces climbing out of the bed: a tank whose whole top half is plain water has nothing to look at,
  // and weed growing on the ledges gives the fish a reason to be up there.
  const span = right - wall - (left + wall)
  // Three to five ledges, each either a broad low reef or a taller, narrower one. At least one of each
  // kind shows up so the tank never reads as all the same shape.
  const count = 3 + Math.floor(rng.next() * 3)
  const tall = Array.from({ length: count }, () => rng.next() < 0.5)
  tall[0] = true
  tall[1] = false
  const slots = count + 1
  // The crest of each mound, so fish can start over the food rather than at even spacing across the tank.
  const crests: { x: number; y: number }[] = []
  tall.forEach((isTall, i) => {
    const jitter = Math.round((span / slots) * (rng.next() - 0.5) * 0.6)
    const cx = left + wall + Math.round((span * (i + 1)) / slots) + jitter

    const lift = isTall
      ? Math.round((floor - surface) * (0.2 + rng.next() * 0.26))
      : Math.round((floor - surface) * (0.12 + rng.next() * 0.2))
    const reach = isTall
      ? Math.max(7, Math.round(span * (0.045 + rng.next() * 0.05)))
      : Math.max(8, Math.round(span * (0.06 + rng.next() * 0.06)))

    for (let dx = -reach; dx <= reach; dx++) {
      const x = cx + dx
      if (x <= left + wall || x >= right - wall) continue

      const across = dx / reach
      const shoulder = Math.round(lift * (1 - across * across) + (rng.next() < 0.25 ? 1 : 0))
      if (shoulder <= 0) continue

      const crest = bed[x] - shoulder
      fill(grid, x, crest, x, bed[x], MaterialId.stone)
      if (rng.next() < 0.4) put(grid, x, crest - 1, MaterialId.algae)
      if (rng.next() < 0.15) put(grid, x, crest, MaterialId.gravel)
    }

    crests.push({ x: cx, y: bed[cx] - lift })
  })

  // Reefs and boulders go down over water that was already there, and where one lands awkwardly it can wall a
  // gap of open air into the rock: a one-cell black speck along the sand line that no water can ever reach.
  // Flooded back here, at the one moment the whole tank is known. Weed dying submerged is the other source of
  // those specks, and that one belongs to the life pass, where a drowned weed leaves water behind.
  for (let x = inLeft; x <= inRight; x++) {
    for (let y = shelf[x] + 2; y < floor; y++) {
      if (grid.material[cellIndex(grid, x, y)] === MaterialId.empty) {
        put(grid, x, y, MaterialId.water)
      }
    }
  }

  // Fish start over the reefs, spread up the water above each crest, not at even spacing: dropped in open
  // water they wandered until they starved with a garden nowhere near them. Every fish gets a mound.
  for (let i = 0; i < 6; i++) {
    const crest = crests[i % crests.length]
    const fx = crest.x + Math.round((rng.next() - 0.5) * 8)
    const fy = surface + 4 + Math.floor(rng.next() * Math.max(1, crest.y - surface - 2))
    put(grid, fx, fy, MaterialId.fish)
  }
}

/**
 * Open country with a pond dug into it: soil to burrow through, grass to graze, bugs on the ground, worms
 * under it and birds over the top, with fish and algae in the water. The two halves share one world on
 * purpose — the sky is wasted space in a tank, and the pond gives the birds something to dive at.
 */
function wild(grid: Grid, rng: Rng): void {
  const { width, height } = grid
  const base = Math.floor(height * 0.62)
  const bedrock = height - Math.floor(height * 0.08)
  const pond = { left: Math.floor(width * 0.55), right: Math.floor(width * 0.88) }
  const depth = Math.floor((bedrock - base) * 0.7)

  const ground = surfaceLine(width, base, Math.max(2, height * 0.045), rng)

  // Bedrock has its own line, deeper than the surface and out of phase with it, with gravel seams where the
  // two come close. A dead straight band of stone under the soil was the last thing that looked drawn.
  const rock = surfaceLine(width, bedrock, Math.max(2, height * 0.03), rng)
  bedrockFloor(grid, ground, rock, rng, [
    { chance: 0.3, up: 1 },
    { chance: 0.15, up: 2 },
  ])

  // A sandy stretch on the left, following the surface rather than cutting across it.
  const sandTo = Math.floor(width * 0.22)
  for (let x = 0; x < sandTo; x++) fill(grid, x, ground[x], x, ground[x] + 3, MaterialId.sand)

  // The pond, dug as a bowl and lined with stone. Bare dirt drinks a pond dry, since every cell it touches
  // turns to mud and takes the water with it, so a rocky pool is the only kind that lasts.
  const middle = (pond.left + pond.right) / 2
  const halfWidth = (pond.right - pond.left) / 2
  const bowl: number[] = []
  for (let x = pond.left; x <= pond.right; x++) {
    const across = (x - middle) / halfWidth
    const dip = Math.round(depth * Math.sqrt(Math.max(0, 1 - across * across)))
    bowl[x] = ground[x] + dip
    if (dip <= 1) continue

    fill(grid, x, ground[x], x, bowl[x] + 2, MaterialId.stone)
    fill(grid, x, ground[x], x, bowl[x] - 1, MaterialId.empty)
    fill(grid, x, ground[x] + 2, x, bowl[x] - 1, MaterialId.water)
  }

  // Seal the basin: any soil left touching the water is a leak, because dirt turns to mud and takes the
  // water with it. The bowl's shallow ends are where that shows up, so it is done by inspection rather than
  // by trusting the shape.
  for (let x = pond.left - 1; x <= pond.right + 1; x++) {
    for (
      let y = ground[Math.max(0, Math.min(width - 1, x))] - 1;
      y <= rock[Math.max(0, Math.min(width - 1, x))];
      y++
    ) {
      if (x < 0 || x >= width || y < 0 || y >= height) continue
      if (grid.material[cellIndex(grid, x, y)] !== MaterialId.water) continue

      for (const [dx, dy] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
        const beside = grid.material[cellIndex(grid, nx, ny)]
        if (beside === MaterialId.dirt || beside === MaterialId.sand) {
          put(grid, nx, ny, MaterialId.stone)
        }
      }
    }
  }

  // Grass on the land: a ragged band, which is the only food a bug can reach. Shoots along the pond edge
  // grow into the water instead, where something that walks on surfaces cannot follow.
  for (let x = Math.floor(width * 0.24); x < pond.left - 2; x++) grassTuft(grid, ground, x, rng)

  // A spring buried under the field, with a drop of water beside it to teach it what to make. A source
  // produces forever, so the field stays damp: wet soil is the only thing grass can grow into, and a lawn
  // with nothing under it is a fixed number of meals.
  const springAt = Math.floor(width * 0.38)
  put(grid, springAt, ground[springAt] + 4, MaterialId.source)
  put(grid, springAt + 1, ground[springAt] + 4, MaterialId.water)

  // Trees on the dry side, with boulders scattered between them.
  const trees = 2 + Math.floor(rng.next() * 2)
  for (let i = 0; i < trees; i++) {
    const x = Math.floor(width * (0.26 + rng.next() * 0.24))
    tree(grid, x, ground[x] - 1, Math.max(6, Math.floor(height * (0.1 + rng.next() * 0.07))), rng)
  }
  for (let i = 0; i < 4; i++) {
    const x = 4 + Math.floor(rng.next() * Math.max(1, pond.left - 10))
    boulder(grid, x, ground[x] + 1, 1 + Math.floor(rng.next() * 3), rng, MaterialId.stone)
  }

  for (let x = pond.left + 6; x < pond.right - 6; x += 4 + Math.floor(rng.next() * 4)) {
    if (bowl[x] !== undefined) put(grid, x, bowl[x] - 1, MaterialId.algae)
  }
  // A few more fish than feels necessary: the ones that wander to the surface get picked off by the birds,
  // and a pond that empties in the first minute is not much of a pond.
  for (let i = 1; i <= 6; i++) {
    const x = pond.left + Math.floor(((pond.right - pond.left) * i) / 7)
    if (bowl[x] !== undefined) put(grid, x, bowl[x] - 2, MaterialId.fish)
  }

  // Seeds lying about on the bare ground: they sprout wherever the soil is wet enough, which is what makes
  // the field feel like it is going somewhere rather than sitting still.
  for (let x = 4; x < pond.left - 4; x += 5 + Math.floor(rng.next() * 9)) {
    put(grid, x, ground[x] - 1, MaterialId.seed)
  }

  // Worms inside the soil, bugs along the grass, birds low enough to see the ground: seeded anywhere else
  // they starve a few cells from a meal.
  for (let i = 1; i <= 5; i++) {
    const x = Math.floor((width * i) / 12)
    put(grid, x, ground[x] + 5 + Math.floor(rng.next() * 4), MaterialId.worm)
  }
  for (let x = Math.floor(width * 0.27); x < pond.left - 4; x += 6) {
    put(grid, x, ground[x] - 3, MaterialId.bug)
  }
  // Two, not a flock: three cleared the bugs and the pond inside a minute.
  for (let i = 1; i <= 2; i++) {
    const x = Math.floor((width * i) / 3)
    put(grid, x, ground[x] - 10 - Math.floor(rng.next() * 8), MaterialId.bird)
  }
}

/**
 * A mountain with a lava source in its throat, a pool at its foot, powder magazines in the rock and slimes
 * living in the caves. Everything here is a thing the sim already does, wired together so it does it without
 * being asked: the source keeps erupting, lava lights whatever it reaches, water answers with steam, the
 * charges go off when the heat gets to them, and the slimes come out of the dark looking for meat.
 */
function volcano(grid: Grid, rng: Rng): void {
  const { width, height } = grid
  const floor = height - Math.floor(height * 0.06)
  const peak = Math.floor(height * 0.2)
  const middle = Math.floor(width * 0.46)
  const spread = Math.floor(width * 0.28)

  fill(grid, 0, floor, width - 1, height - 1, MaterialId.stone)

  // The cone. A parabola on its own is a drawn shape, so the slope wanders by a few cells as it climbs and
  // gravel shows through where the rock breaks.
  const skin = surfaceLine(width, 0, Math.max(2, height * 0.035), rng)
  const slope: number[] = []
  for (let dx = -spread; dx <= spread; dx++) {
    const across = Math.abs(dx) / spread
    const x = middle + dx
    // Jitter only ever lowers the surface, never raises it (hence the `max(0, ...)`), and the summit stays
    // clean. A bump standing proud of the smooth cone dams the overflow on that side, so lava pours down one
    // face; keeping every column at or below the parabola leaves a downhill path off both sides of the rim.
    const rough = Math.abs(dx) <= 6 ? 0 : Math.max(0, skin[Math.abs(x) % width])
    const top = Math.round(peak + (floor - peak) * across * across * 0.9 + rough)
    slope[x] = top
    fill(grid, x, top, x, floor - 1, MaterialId.stone)
    // Gravel only on the outer faces, well clear of the vent: loose grains over the mouth roll down the
    // shaft and bury the sources.
    if (Math.abs(dx) > 6) {
      if (rng.next() < 0.3) put(grid, x, top, MaterialId.gravel)
      if (rng.next() < 0.1) put(grid, x, top + 1, MaterialId.gravel)
    }
  }

  const rim = slope[middle]
  const crater = rim + 1
  const shaftFoot = floor - 4

  // A row of sources across the crater floor, left dormant rather than fed. They only start making lava once
  // the column below rises far enough to touch them, so the crater fills and spills after the eruption has
  // climbed rather than pouring from the first tick. A row of them, not one: a lone trickle crusts to stone at
  // the rim and plugs the vent, while a full row keeps the crater brimming so it spills over both lips.
  fill(grid, middle - 3, rim, middle + 3, crater, MaterialId.empty)
  fill(grid, middle - 3, crater + 1, middle + 3, crater + 1, MaterialId.empty)
  fill(grid, middle - 4, rim, middle - 4, floor - 1, MaterialId.stone)
  fill(grid, middle + 4, rim, middle + 4, floor - 1, MaterialId.stone)
  fill(grid, middle - 1, crater - 1, middle + 1, crater, MaterialId.source)

  // The shaft below the crater is the mountain's molten interior, sealed off from the vent so it is glow, not
  // supply. It is webbed with tributaries — cracks that branch and sprawl through the rock like roots — so the
  // light tangles through the whole mountain rather than standing in one straight column. `stopAbove` keeps a
  // vein a good five cells inside the outer face, so it fills with lava and glows rather than draining it out.
  fill(grid, middle - 1, crater + 2, middle + 1, shaftFoot, MaterialId.empty)
  const inside = (col: number) => slope[Math.max(0, Math.min(width - 1, col))] + 5
  const veins = 6 + Math.floor(rng.next() * 4)
  for (let i = 0; i < veins; i++) {
    const side = rng.next() < 0.5 ? -1 : 1
    const fromY = crater + 6 + Math.floor(rng.next() * (shaftFoot - crater - 8))
    const down = rng.next() < 0.6 ? 1 : 0
    vein(grid, middle + side * 2, fromY, side, down, 18 + Math.floor(rng.next() * 20), rng, {
      stopAbove: inside,
      branch: 0.28,
    })
  }

  // Fill the shaft, and stud it with pre-fed sources that keep pushing lava out into the tributary network so
  // the whole web stays molten instead of the upward branches sitting dark.
  fill(grid, middle - 1, crater + 4, middle + 1, shaftFoot, MaterialId.lava)
  for (let y = crater + 6; y < shaftFoot; y += 7) {
    put(grid, middle, y, MaterialId.source)
    grid.data[cellIndex(grid, middle, y)] = MaterialId.lava
  }

  // Dens at the feet of the mountain, each stocked with prey the slimes can reach on the spot. A slime walled
  // into a sealed pocket moves through anything loose but not through solid stone, so the den is dug wide and
  // a tunnel breaks it out to daylight — but the point is not that they escape, it is that they hunt, so the
  // worms and bugs live in the den with them.
  for (let side = -1; side <= 1; side += 2) {
    const cx = middle + side * Math.floor(spread * 0.82)
    const cy = floor - 7
    boulder(grid, cx, cy, 6 + Math.floor(rng.next() * 3), rng, MaterialId.empty)
    // A dirt floor for the worms to burrow, with worms and bugs on it, then the slimes above.
    fill(grid, cx - 5, cy + 4, cx + 5, floor - 1, MaterialId.dirt)
    for (let dx = -4; dx <= 4; dx += 2) put(grid, cx + dx, cy + 4, MaterialId.worm)
    for (let dx = -3; dx <= 3; dx += 3) put(grid, cx + dx, cy + 3, MaterialId.bug)
    // Three cells across and cut clean through the mountainside. A slime walks and cannot climb through open
    // air, so a one-cell passage that winds and rises is a wall to it however far it goes. Stopping the
    // channel at the surface line leaves a skin of rock across the mouth, which reads as a cave with a lid on
    // it: the tunnel runs a few cells past the slope so the hole is genuinely open, and a flow coming down the
    // face can pour straight in. The length is measured off the climb rather than fixed, or a tall foothill
    // swallows the tunnel before it arrives.
    const climb = Math.max(20, cy - slope[Math.max(0, Math.min(width - 1, cx))] + 16)
    const toDaylight = (col: number) =>
      slope[Math.max(0, Math.min(width - 1, col))] - CAVE_MOUTH_CLEARANCE
    // Two ways out, one leaning out across the flank and one going more or less straight up. A single
    // wandering channel can spend its length inside the rock and finish nowhere, and a den with no way out is
    // the one thing this is all for; a second attempt on a different bearing costs a few cells of stone.
    vein(grid, cx, cy - 2, side, -1, climb, rng, { stopAbove: toDaylight, bore: 3 })
    vein(grid, cx + side * 2, cy - 2, 0, -1, climb, rng, { stopAbove: toDaylight, bore: 3 })
    put(grid, cx - 1, cy + 1, MaterialId.slime)
    put(grid, cx + 1, cy + 1, MaterialId.slime)
    put(grid, cx, cy, MaterialId.slime)
  }

  // Magazines out in the flanks, a long way from the vent: buried next to the chamber they all went off in
  // the first few seconds, which spends the surprise before anyone is watching. Out here the flow has to
  // reach them.
  for (let i = 0; i < 3; i++) {
    const side = rng.next() < 0.5 ? -1 : 1
    const x = middle + side * Math.round(spread * (0.55 + rng.next() * 0.35))
    const y = slope[Math.max(0, Math.min(width - 1, x))] + 4 + Math.floor(rng.next() * 8)
    boulder(grid, x, y, 2 + Math.floor(rng.next() * 2), rng, MaterialId.gunpowder)
  }
  for (let i = 0; i < 2; i++) {
    const side = rng.next() < 0.5 ? -1 : 1
    const x = middle + side * Math.round(spread * (0.4 + rng.next() * 0.3))
    const y = slope[Math.max(0, Math.min(width - 1, x))] + 6 + Math.floor(rng.next() * 6)
    boulder(grid, x, y, 2, rng, MaterialId.tnt)
  }

  // A lake on the low ground to the side, lined so it holds: lava reaching it is the show.
  const lake = { left: Math.floor(width * 0.04), right: Math.floor(width * 0.14) }
  fill(grid, lake.left - 1, floor - 12, lake.right + 1, floor - 1, MaterialId.stone)
  fill(grid, lake.left, floor - 11, lake.right, floor - 1, MaterialId.water)
  for (let x = lake.left; x <= lake.right; x += 3) put(grid, x, floor - 12, MaterialId.algae)

  // A living corner in the foothills, far enough from the vent to last: something for the slimes to hunt,
  // since a predator with nothing to eat is a corpse on a timer.
  const meadow = { left: Math.floor(width * 0.78), right: Math.floor(width * 0.96) }
  fill(grid, meadow.left, floor - 2, meadow.right, floor - 1, MaterialId.dirt)
  for (let x = meadow.left; x < meadow.right; x += 2) put(grid, x, floor - 3, MaterialId.plant)
  for (let x = meadow.left + 3; x < meadow.right; x += 7) put(grid, x, floor - 4, MaterialId.bug)
  for (let x = meadow.left + 2; x < meadow.right; x += 6) put(grid, x, floor - 2, MaterialId.worm)

  // Woods on the far side, which is what the first lava flow finds.
  for (let i = 0; i < 3; i++) {
    const x = Math.floor(width * (0.82 + rng.next() * 0.14))
    tree(grid, x, floor - 1, Math.max(6, Math.floor(height * (0.09 + rng.next() * 0.06))), rng)
  }

  // Birds over the woods, low enough to see the bugs in the meadow below them: a bird's sight reaches about
  // eighteen cells, so one put up in the clouds starves over a full larder. Placed into clear air, since a
  // bird sitting in the leaves of a tree is out of its medium and drains out within seconds.
  for (let i = 0; i < 3; i++) {
    const bx = Math.floor(width * (0.8 + rng.next() * 0.16))
    const perch = clearAir(grid, bx, floor - 10 - Math.floor(rng.next() * 4))
    if (perch >= 0) put(grid, bx, perch, MaterialId.bird)
  }

  // A pocket of oil sealed deep in the rock, well below the surface. Methane would seep straight up out of
  // the mountain and be gone; oil sits in its pocket and waits for a lava flow to find it and catch.
  const oilAt = middle - Math.floor(spread * 0.5)
  const oilX = Math.max(0, Math.min(width - 1, oilAt))
  boulder(grid, oilX, Math.round((slope[oilX] + floor) / 2), 3, rng, MaterialId.oil)
}

/**
 * A plain ant colony: open ground with a couple of thick wooden logs to tunnel into, a leaf bush at each
 * for food, and ants scattered along the ground. The ants bore galleries into the logs and draw lines out
 * along the ground. Deliberately basic — it exists to show the ants working, with no point shaping it
 * while their behaviour is still being tuned.
 */
function antColony(grid: Grid, rng: Rng): void {
  const { width, height } = grid
  const base = Math.floor(height * 0.68)
  const bedrock = height - Math.floor(height * 0.07)

  // The land the whole scene stands on: a wandering surface over a bedrock line of its own, the same way the
  // wild is built, so neither the farm nor the country beside it sits on a drawn straight edge.
  const ground = surfaceLine(width, base, Math.max(2, height * 0.035), rng)
  const rock = surfaceLine(width, bedrock, Math.max(2, height * 0.025), rng)
  bedrockFloor(grid, ground, rock, rng, [{ chance: 0.25, up: 1 }])

  // --- The farm: a glass case sunk into the ground on the left, packed with wood for the colony to work.
  // Glass is the point of it. An ant bores wood, plants and vine and nothing else, so a glass wall holds a
  // colony in for good — the ants inside can tunnel as far as they like and never get out among the birds.
  const farmLeft = Math.floor(width * 0.05)
  const farmRight = Math.floor(width * 0.38)
  const farmTop = Math.floor(height * 0.16)
  const farmFloor = Math.max(...ground.slice(farmLeft, farmRight + 1)) + Math.floor(height * 0.06)

  fill(grid, farmLeft, farmTop, farmRight, farmFloor, MaterialId.empty)
  // Panes: two cells of glass all round, so a stray blast does not open the case on the first crack.
  fill(grid, farmLeft, farmTop, farmLeft + 1, farmFloor, MaterialId.glass)
  fill(grid, farmRight - 1, farmTop, farmRight, farmFloor, MaterialId.glass)
  fill(grid, farmLeft, farmFloor - 1, farmRight, farmFloor, MaterialId.glass)
  fill(grid, farmLeft, farmTop, farmRight, farmTop + 1, MaterialId.glass)

  // The nest inside, filled to an uneven line with a clear band of air under the lid — a case packed to the
  // brim reads as a solid block, and the gap is where you watch the galleries break the surface.
  const nestTop = surfaceLine(
    farmRight - farmLeft + 1,
    farmTop + Math.floor(height * 0.1),
    2.5,
    rng
  )
  for (let x = farmLeft + 2; x <= farmRight - 2; x++) {
    fill(grid, x, nestTop[x - farmLeft], x, farmFloor - 2, MaterialId.wood)
  }

  // A bed of soil along the floor of the case with leaf litter rooted in it. The crop is finite on purpose: a
  // leaf only grows back into wet soil, and a spring anywhere near the leaves is an endless supply of new
  // leaf that packs the case solid, so a jar is stocked generously rather than plumbed.
  const bedTop = farmFloor - 6
  fill(grid, farmLeft + 2, bedTop, farmRight - 2, farmFloor - 2, MaterialId.dirt)
  // The spring needs somewhere to put what it makes, so it sits in a hollow rather than packed in soil — a
  // source with no open cell in reach simply goes quiet, the same lesson the volcano's vent taught.
  for (let x = farmLeft + 3; x <= farmRight - 3; x += 2) {
    for (let up = 1; up <= 1 + Math.floor(rng.next() * 3); up++) {
      put(grid, x, bedTop - up, MaterialId.plant)
    }
  }

  // Leaf pockets buried through the timber as well as the bed at the bottom. An ant only smells food about
  // sixteen cells off, so a nest seeded at the top of a tall case starves halfway down to a full larder —
  // scattered pockets mean there is always something within reach of wherever the galleries have got to.
  const pockets = Math.max(6, Math.round((farmFloor - farmTop) / 5))
  for (let i = 0; i < pockets; i++) {
    const px = farmLeft + 4 + Math.floor(rng.next() * Math.max(1, farmRight - farmLeft - 8))
    const py = farmTop + 6 + Math.floor(rng.next() * Math.max(1, bedTop - farmTop - 8))
    boulder(grid, px, py, 4, rng, MaterialId.plant)
  }

  // The colony, seeded down in the wood where it starts boring straight away.
  const ants = Math.max(6, Math.round((farmRight - farmLeft) / 7))
  for (let i = 0; i < ants; i++) {
    const ax = farmLeft + 3 + Math.floor(rng.next() * Math.max(1, farmRight - farmLeft - 6))
    const ay = nestTop[ax - farmLeft] + 1 + Math.floor(rng.next() * 5)
    put(grid, ax, Math.min(ay, farmFloor - 3), MaterialId.ant)
  }

  // --- The country outside: grass, trees, boulders, and the creatures that would make short work of any ant
  // that ever got loose. Kept to the right of the case so the two read as neighbours.
  const wildFrom = farmRight + Math.floor(width * 0.04)

  for (let x = wildFrom; x < width - 2; x++) grassTuft(grid, ground, x, rng)

  // Trees with trunks thick enough to hold a gallery, and a nest already in each one: a tree out here is a
  // colony of its own, working away with the birds overhead rather than safe behind glass.
  const trees = 3 + Math.floor(rng.next() * 2)
  for (let i = 0; i < trees; i++) {
    const tx = wildFrom + 4 + Math.floor(rng.next() * Math.max(1, width - wildFrom - 12))
    const trunk = Math.max(8, Math.floor(height * (0.12 + rng.next() * 0.08)))
    const girth = 3 + Math.floor(rng.next() * 3)
    tree(grid, tx, ground[tx] - 1, trunk, rng, girth)
    // Down in the trunk, a few cells up from the roots, where it starts boring straight away.
    put(grid, tx, ground[tx] - 2 - Math.floor(rng.next() * 4), MaterialId.ant)
  }

  for (let i = 0; i < 4; i++) {
    const bx = wildFrom + Math.floor(rng.next() * Math.max(1, width - wildFrom - 4))
    boulder(grid, bx, ground[bx] + 1, 1 + Math.floor(rng.next() * 3), rng, MaterialId.stone)
  }

  for (let x = wildFrom + 4; x < width - 6; x += 8 + Math.floor(rng.next() * 6)) {
    put(grid, x, ground[x] - 3, MaterialId.bug)
  }
  // Bugs and birds only. A worm eats dirt, which is unlimited, so a few of them breed away underground and
  // hollow the whole field out — this scene is about the ants and the things that hunt them.
  // Low enough over the field to see a bug and dive on it — a bird's sight reaches about eighteen cells, so
  // one parked up in the clouds never spots a thing and starves over the grass. Placed into clear air, since
  // a bird sitting in the leaves of a tree is out of its medium and drains out within seconds.
  for (let i = 1; i <= 3; i++) {
    const bx = wildFrom + Math.floor(((width - wildFrom) * i) / 4)
    const perch = clearAir(grid, bx, ground[bx] - 8)
    if (perch >= 0) put(grid, bx, perch, MaterialId.bird)
  }
}

/** The nearest row at or above `from` where a flier has open air all round it, or -1 if there is none. */
function clearAir(grid: Grid, x: number, from: number): number {
  for (let y = from; y >= 1; y--) {
    const open =
      grid.material[cellIndex(grid, x, y)] === MaterialId.empty &&
      grid.material[cellIndex(grid, x, y - 1)] === MaterialId.empty &&
      grid.material[cellIndex(grid, Math.max(0, x - 1), y)] === MaterialId.empty &&
      grid.material[cellIndex(grid, Math.min(grid.width - 1, x + 1), y)] === MaterialId.empty
    if (open) return y
  }
  return -1
}

/** How many vessels the kitchen builds, alternating a lidded pot of kernels with an open pan of fireworks. */
const KITCHEN_PANS = 4
/**
 * How many stalls the dividers cut the counter into. Two, so each holds a pot and a pan: the popcorn does
 * nothing to the fireworks, and the fireworks get the width of two vessels to burst across. The wall is only
 * there to keep one stall's sparks out of the other's.
 */
const KITCHEN_STALLS = 2
/** How thick the fuse is. Three, because one reads as a scratch on the counter rather than a fuse. */
const KITCHEN_FUSE_HEIGHT = 3
/** How many 2×2 blocks of source sit in each firebox. */
const KITCHEN_BURNERS = 8
/** Left edge to left edge between burner blocks, so the gap between them is this less the block's 2 cells. */
const KITCHEN_BURNER_PITCH = 5

/** How many cells shallower a pan's walls are than a pot's, which is most of what tells the two apart. */
const KITCHEN_PAN_SHALLOWER = 5
/** How far the middle of a pot's lid sits above its edges. */
const KITCHEN_LID_RISE = 4
/** How far the lid is pushed off centre: the gap it leaves at one shoulder and its overhang at the other. */
const KITCHEN_LID_SHIFT = 4
/** How far a pan's handle juts out past its wall, and how many cells it runs before lifting another one. */
const KITCHEN_HANDLE_LENGTH = 10
const KITCHEN_HANDLE_RUN = 3

/** How thickly the filling fills a vessel: ragged rather than solid, so the heat gets in among it. */
const KITCHEN_FILL_DENSITY = 0.82

/**
 * A counter of metal pots and pans over burners, lit one after another by a single fuse. Lidded pots hold the
 * kernels and open pans hold the fireworks, which is also the difference between the two things they do: one
 * rattles under a lid and the other goes straight up out of the pan.
 *
 * Metal is the only thing that would do for them: it neither melts nor breaks, so they survive what is under
 * them, and it is far and away the best conductor, so the heat arrives at what is inside rather than stopping
 * at the base. The base is two cells thick, which is what paces the cooking: through one the vessel pops twice
 * as fast and is empty in half the time, and the odd kernel chars instead of popping.
 *
 * The fuse is what makes it a show rather than a bang. It runs the length of the counter, lit at the near end
 * by a single flame, and burns at roughly a cell every four or five ticks — so each pan goes off several
 * seconds after the one before it, and there is time to watch each one. Under every pan it passes a firebox of
 * source blocks that touch nothing: a source copies the first material fed to it, so the only thing that can
 * ever reach one here is the flame the fuse vents upward, and then it makes flame of its own forever. That is
 * the whole trick, and it is why they sit in clear air — one placed against the pan learned stone instead.
 *
 * The firebox is tall for the same reason a chimney is. A burning cell vents smoke as well as flame, and the
 * flame it vents becomes smoke in another thirty ticks, so the smoke in a firebox outweighs the flame about
 * five to one. Height sorts them: the smoke climbs to the exhaust gaps under the base and the flame clings to
 * the fuse it came off, down where the sources are. Squat, and every burner in the world learned smoke.
 */
function kitchen(grid: Grid, rng: Rng): void {
  const { width, height } = grid
  const counter = height - 8
  const fuse = counter - 1
  const base = fuse - 14
  const rim = base - 14

  fill(grid, 0, counter, width - 1, height - 1, MaterialId.stone)

  const span = Math.floor(width / KITCHEN_PANS)
  const stall = Math.floor(width / KITCHEN_STALLS)
  for (let divider = 1; divider < KITCHEN_STALLS; divider++) {
    fill(grid, divider * stall - 1, 0, divider * stall, fuse - 1, MaterialId.stone)
  }

  // One fuse for the whole counter, threaded through the dividers rather than round them: the gap in a wall
  // is filled with wood, so the burn crosses but the sparks and embers on either side cannot. It sinks into
  // the counter rather than standing on it, so thickening it leaves everything above at the same height.
  fill(grid, 0, fuse, width - 1, fuse + KITCHEN_FUSE_HEIGHT - 1, MaterialId.wood)
  put(grid, 1, fuse - 1, MaterialId.fire)

  for (let vessel = 0; vessel < KITCHEN_PANS; vessel++) {
    // Pots are deep and narrow and take a lid; pans are shallow, wide and open. Which one you are looking at
    // should be obvious before anything happens in it, so the shape carries it rather than the contents.
    const isPot = vessel % 2 === 0
    const left = vessel * span + Math.floor(span * (isPot ? 0.28 : 0.18))
    const right = left + Math.floor(span * (isPot ? 0.44 : 0.6))
    const middle = Math.floor((left + right) / 2)
    const lip = isPot ? rim : rim + KITCHEN_PAN_SHALLOWER

    // Legs down to the fuse, so the firebox under the base is a chimney: metal overhead, metal at both sides,
    // fuse for a floor. A pair of gaps just under the base is the exhaust.
    fill(grid, left, base, right, base + 1, MaterialId.metal)
    fill(grid, left, lip, left, base + 1, MaterialId.metal)
    fill(grid, right, lip, right, base + 1, MaterialId.metal)
    fill(grid, left, base + 4, left, fuse - 1, MaterialId.metal)
    fill(grid, right, base + 4, right, fuse - 1, MaterialId.metal)

    // The lid: a dome the full width of the pot, resting a cell above the rim and pushed to one side. Sitting
    // to one side is what makes it read as a lid at all — it leaves the pot open at one shoulder and hangs
    // over the far wall by the same amount, which is a lid knocked askew rather than a plate that fits badly.
    // Sealed it would still cook, but watching popcorn escape past it is the point of a lid.
    if (isPot) {
      dome(grid, left + KITCHEN_LID_SHIFT, right + KITCHEN_LID_SHIFT, lip - 1, KITCHEN_LID_RISE)
    }

    // A handle out of the pan's right side, lifting as it goes: the one line that says frying pan rather than
    // open box, and the pot has a lid to say the same thing about itself.
    if (!isPot) {
      for (let out = 1; out <= KITCHEN_HANDLE_LENGTH; out++) {
        put(grid, right + out, lip - Math.floor(out / KITCHEN_HANDLE_RUN), MaterialId.metal)
      }
    }

    // Blocks a cell apart, so no two touch and none touches the fuse — a source teaches every source it
    // touches, which would make one connected run a single roll for the whole vessel.
    const burnerStart = middle - Math.floor((KITCHEN_BURNERS * KITCHEN_BURNER_PITCH - 2) / 2)
    for (let burner = 0; burner < KITCHEN_BURNERS; burner++) {
      const at = burnerStart + burner * KITCHEN_BURNER_PITCH
      fill(grid, at, fuse - 3, at + 1, fuse - 2, MaterialId.source)
    }

    // Ragged rather than a solid block, so the heat gets in among it.
    const filling = isPot ? MaterialId.kernel : MaterialId.firework
    for (let y = base - 1; y > base - 7; y--) {
      for (let x = left + 1; x < right; x++) {
        if (rng.next() < KITCHEN_FILL_DENSITY) put(grid, x, y, filling)
      }
    }
  }
}

/**
 * The hazard plate bolted beside the containment cell. Sponge is the only bright yellow that stays put — the
 * rest of the yellows are powders and would pour off the wall — and stone is the darkest thing that does
 * nothing on its own, which rules out the two that are actually black.
 */
const DANGER_SIGN: readonly string[] = [
  '.....A.....',
  '....AAA....',
  '....ABA....',
  '...AABAA...',
  '...AABAA...',
  '..AAABAAA..',
  '..AAAAAAA..',
  '.AAAABAAAA.',
  '.AAAAAAAAA.',
  'AAAAAAAAAAA',
]

const SIGN_LEGEND = { A: MaterialId.sponge, B: MaterialId.stone } as const

/** How many cells thick the containment chamber's wall is. */
const CELL_WALL = 3
/** How far the middle of the lab's barrel roof stands above the ceiling it sits on. */
const LAB_ROOF_RISE = 14
/** How far either side of its column the pedestal's cap reaches, so the specimen stands on a wide base. */
const PEDESTAL_CAP = 4
/** How many cells thick the reactor vault's wall is. */
const CORE_WALL = 3
/** How many columns of earth are banked against each end wall. */
const LAB_BERM = 16
/** How many wild sources stand in the reactor room. Fixed, because the building is drawn to a plan. */
const CORE_SOURCES = 3

/**
 * A lab running three experiments at once: a bunker holding one cell of corruption on a pedestal, a glass pen
 * of animals, and a vault of wild sources hanging in mid-air. An incinerator of lava stands at the far end,
 * which is the only thing in the world that stops what gets out of the bunker.
 *
 * The corruption eats down its pedestal, crosses the deck taking everything standing on it — the pen of
 * animals on the way turns to slime rather than to wall — and finally reaches the lava.
 *
 * Deliberately the least random preset of the set: the building is drawn to a plan and the randomness is in
 * the terrain outside it and in what the pen happens to be stocked with. A lab that came out different every
 * time would read as rubble rather than as a place somebody built.
 *
 * Two things about corruption set the whole plan. It cannot cross open air, only travel through material it
 * touches — so the pedestal is its only way down and the metal deck is what carries it the length of the hall.
 * And it spreads at the same rate through metal, glass and stone alike, measured, all three identical, so what
 * buys time is distance and nothing else: a thicker wall of a better material is a thicker wall, no more. The
 * first bunker had a void between two walls, which reads as high security and in fact contains the thing
 * completely and forever, because there is no material across the gap for it to travel through.
 */
function madScience(grid: Grid, rng: Rng): void {
  const { width, height } = grid
  const base = Math.floor(height * 0.76)
  const bedrock = height - Math.floor(height * 0.07)

  // The country the lab was built on, and the only part of the scene that changes between loads.
  const ground = surfaceLine(width, base, Math.max(2, height * 0.03), rng)
  const rock = surfaceLine(width, bedrock, Math.max(2, height * 0.02), rng)
  bedrockFloor(grid, ground, rock, rng, [{ chance: 0.22, up: 1 }])

  const labLeft = Math.floor(width * 0.08)
  const labRight = width - 1 - labLeft
  const span = labRight - labLeft
  const deck = base + 2
  const roof = Math.floor(height * 0.5)
  const floorY = deck - 2

  // --- The shell. Hollowed out first, then walled: a metal deck, a barrel roof over a flat ceiling, and glass
  // down the top course of both end walls, so you can see the whole hall at once and watch it crossed.
  fill(grid, labLeft, roof - LAB_ROOF_RISE, labRight, deck, MaterialId.empty)
  fill(grid, labLeft, deck - 1, labRight, deck, MaterialId.metal)
  fill(grid, labLeft, roof, labLeft + 1, deck, MaterialId.metal)
  fill(grid, labRight - 1, roof, labRight, deck, MaterialId.metal)
  fill(grid, labLeft, roof + 2, labLeft + 1, roof + 11, MaterialId.glass)
  fill(grid, labRight - 1, roof + 2, labRight, roof + 11, MaterialId.glass)
  dome(grid, labLeft, labRight - 1, roof, LAB_ROOF_RISE)

  // Trusses standing in the void between the arch and the ceiling it springs from. Glazing panels of the arch
  // was the first attempt and came to nothing: glass and metal are four shades apart, so the skylights were
  // invisible and the roof still read as one drawn line. Struts cross the gap, so they show.
  const archAt = (x: number) =>
    roof -
    Math.round(LAB_ROOF_RISE * Math.sin((Math.PI * (x - labLeft)) / (labRight - 1 - labLeft)))
  for (let x = labLeft + 18; x < labRight - 18; x += 30) {
    fill(grid, x, archAt(x) + 1, x, roof - 1, MaterialId.metal)
  }

  // Knee braces where the walls meet the ceiling, two cells thick: stepped a cell at a time they come out as
  // a dotted diagonal, which reads as debris rather than as steelwork.
  for (let step = 0; step < 10; step++) {
    fill(
      grid,
      labLeft + 2 + step,
      roof + 10 - step,
      labLeft + 3 + step,
      roof + 11 - step,
      MaterialId.metal
    )
    fill(
      grid,
      labRight - 3 - step,
      roof + 10 - step,
      labRight - 2 - step,
      roof + 11 - step,
      MaterialId.metal
    )
  }

  // A catwalk slung off the ceiling over the near half of the hall, where the floor below it is clear. Run the
  // full length it collides with everything standing on the deck, and hung every twenty cells it reads as a
  // row of railings across the room rather than as a walkway.
  const catwalk = roof + 16
  const catwalkEnd = labLeft + Math.floor(span * 0.26)
  fill(grid, labLeft + 6, catwalk, catwalkEnd, catwalk, MaterialId.metal)
  for (let x = labLeft + 14; x < catwalkEnd; x += 42) {
    fill(grid, x, roof + 1, x, catwalk - 1, MaterialId.metal)
  }

  /** A plinth under a station, so nothing in the hall stands straight on the deck. */
  const plinth = (left: number, right: number) =>
    fill(grid, left - 3, deck - 3, right + 3, deck - 2, MaterialId.metal)

  // --- The containment bunker at the near end: an empty metal room under a barrel roof of its own, with the
  // specimen alone on a pedestal in the middle of it and a glass port to look in through.
  //
  // The pedestal is also the only way out. Corruption travels through what it touches and cannot cross open
  // air, so it has to eat down the column and along the floor before it reaches a wall — which is a slower and
  // far better start than the block of rock this replaced, where it simply chewed outward in every direction.
  const cellLeft = labLeft + 8
  const cellRight = cellLeft + Math.floor(span * 0.13)
  const cellTop = floorY - Math.floor((floorY - roof) * 0.5)

  plinth(cellLeft, cellRight)
  fill(grid, cellLeft, cellTop, cellRight, floorY, MaterialId.metal)
  dome(grid, cellLeft, cellRight - 1, cellTop, 7)
  fill(
    grid,
    cellLeft + CELL_WALL,
    cellTop + CELL_WALL,
    cellRight - CELL_WALL,
    floorY,
    MaterialId.empty
  )

  // A round hatch in the front wall rather than a slot: the one door reads as the way in.
  const hatch = Math.floor((cellTop + CELL_WALL + floorY) / 2)
  for (let dy = -5; dy <= 5; dy++) {
    const reach = Math.round(Math.sqrt(Math.max(0, 25 - dy * dy)) * 0.6)
    fill(grid, cellRight - reach, hatch + dy, cellRight, hatch + dy, MaterialId.glass)
  }

  const pillar = Math.floor((cellLeft + cellRight) / 2)
  const cap = Math.floor((cellTop + CELL_WALL + floorY) / 2)
  fill(grid, pillar - 1, cap + 2, pillar + 1, floorY, MaterialId.metal)
  fill(grid, pillar - PEDESTAL_CAP, cap, pillar + PEDESTAL_CAP, cap + 1, MaterialId.metal)
  placeMaterial(grid, cellIndex(grid, pillar, cap - 1), MaterialId.corruption)

  // The hazard plate on a post beside the bunker, at head height.
  const signLeft = cellRight + 8
  const signTop = cellTop - 4
  stamp(grid, signLeft, signTop, DANGER_SIGN, SIGN_LEGEND)
  fill(grid, signLeft + 5, signTop + DANGER_SIGN.length, signLeft + 5, floorY, MaterialId.metal)

  // --- The pen, in the middle of the hall: a glass tank of water on a bed of algae, stocked at random, with an
  // arched cap so it is not one more box in a row of boxes.
  const penLeft = labLeft + Math.floor(span * 0.3)
  const penRight = labLeft + Math.floor(span * 0.56)
  const penTop = roof + Math.floor((deck - roof) * 0.3)

  plinth(penLeft, penRight)
  fill(grid, penLeft, penTop, penRight, floorY, MaterialId.glass)
  fill(grid, penLeft + 2, penTop + 2, penRight - 2, floorY - 1, MaterialId.empty)
  const waterLine = penTop + Math.floor((floorY - penTop) * 0.3)
  fill(grid, penLeft + 2, waterLine, penRight - 2, floorY - 1, MaterialId.water)
  for (let x = penLeft + 2; x <= penRight - 2; x++) {
    if (rng.next() < 0.5) put(grid, x, floorY - 1, MaterialId.algae)
    if (rng.next() < 0.14) put(grid, x, floorY - 2, MaterialId.algae)
  }
  scatterLife(grid, rng, penLeft + 3, penRight - 3, waterLine, floorY - 3)
  dome(grid, penLeft, penRight - 1, penTop, 6)

  // --- The reactor room: a barrel vault with the wild sources hanging unsupported in the middle of it. A wild
  // source is a static material, so it stays exactly where it is put and nothing has to hold it up. Clamps
  // above and below were the first attempt and are gone: whatever they added in apparatus they took away from
  // the one thing worth looking at, which is a substance floating in an empty room on nothing at all.
  //
  // Walled because watching the vault fill with whatever the things decide to pour is the point of having
  // them, and out on the open deck they read as a spill rather than as an experiment.
  const coreX = labLeft + Math.floor(span * 0.7)
  const coreHalf = Math.floor(span * 0.075)
  const coreSpring = floorY - Math.floor((floorY - roof) * 0.26)

  plinth(coreX - coreHalf, coreX + coreHalf)
  vaultRoom(
    grid,
    coreX - coreHalf,
    coreX + coreHalf,
    floorY,
    coreSpring,
    CORE_WALL,
    MaterialId.metal
  )
  fill(grid, coreX - coreHalf - 4, floorY, coreX + coreHalf + 4, deck, MaterialId.metal)

  // Halfway between the crown of the arch and the floor, so it hangs in the middle of the room rather than up
  // under the ceiling. The arch rises by the room's own inner half-width, which is the span less both walls.
  const held = Math.floor((coreSpring - (coreHalf - CORE_WALL) + floorY) / 2)
  for (let n = 0; n < CORE_SOURCES; n++) {
    put(grid, coreX - CORE_SOURCES + 1 + n * 2, held, MaterialId.randomSource)
  }

  // --- The incinerator at the far end: a lava tank under an extraction hood, ducted into the ceiling.
  const pitLeft = labLeft + Math.floor(span * 0.84)
  const pitRight = labRight - 5
  const pitTop = deck - Math.floor((deck - roof) * 0.36)

  plinth(pitLeft, pitRight)
  fill(grid, pitLeft, pitTop, pitRight, floorY, MaterialId.metal)
  fill(grid, pitLeft + 2, pitTop + 2, pitRight - 2, floorY - 1, MaterialId.lava)
  dome(grid, pitLeft + 3, pitRight - 4, pitTop - 7, 4)
  fill(grid, pitLeft + 3, pitTop - 6, pitLeft + 4, pitTop - 1, MaterialId.metal)
  fill(grid, pitRight - 4, pitTop - 6, pitRight - 3, pitTop - 1, MaterialId.metal)
  // The duct up from the hood into the roof, which is what the service run along the ceiling is for.
  const duct = Math.floor((pitLeft + pitRight) / 2)
  fill(grid, duct - 1, roof + 1, duct, pitTop - 11, MaterialId.metal)

  // --- Outside: earth banked up against both end walls, and a tree either side of the site.
  //
  // The berm is what stops the building meeting the ground along one ruled line. It goes on after everything
  // else so it banks against the finished walls, and it slopes away over `LAB_BERM` columns rather than
  // stepping, so the two do not read as two rectangles stacked.
  for (let step = 1; step <= LAB_BERM; step++) {
    const crest = floorY - Math.round((1 - step / LAB_BERM) ** 1.6 * 12)
    for (const x of [labLeft - step, labRight + step]) {
      for (let y = crest; y <= ground[Math.max(0, Math.min(width - 1, x))]; y++) {
        if (grid.material[cellIndex(grid, x, y)] !== MaterialId.empty) continue
        put(grid, x, y, rng.next() < 0.16 ? MaterialId.gravel : MaterialId.dirt)
      }
    }
  }

  // Full-grown ones, so the site reads as somewhere that has stood a while. They go on after the berm, or the
  // bank would be piled over the trunks.
  for (const side of [
    Math.floor(labLeft * 0.55),
    labRight + Math.floor((width - labRight) * 0.5),
  ]) {
    const at = Math.max(2, Math.min(width - 3, side + Math.floor(rng.next() * 6) - 3))
    tree(grid, at, ground[at] - 1, 26 + Math.floor(rng.next() * 8), rng, 5)
  }
}

/** Drops a few of each creature into a tank, above the water line for the bird and in it for the rest. */
function scatterLife(
  grid: Grid,
  rng: Rng,
  left: number,
  right: number,
  waterLine: number,
  floorY: number
): void {
  const place = (material: MaterialId, count: number, top: number, bottom: number) => {
    for (let n = 0; n < count; n++) {
      const x = left + Math.floor(rng.next() * (right - left + 1))
      const y = top + Math.floor(rng.next() * Math.max(1, bottom - top + 1))
      put(grid, x, y, material)
    }
  }

  place(MaterialId.fish, 5, waterLine + 2, floorY - 2)
  place(MaterialId.worm, 4, floorY - 1, floorY)
  place(MaterialId.bug, 4, waterLine - 6, waterLine - 2)
  place(MaterialId.bird, 2, waterLine - 8, waterLine - 5)
}

const BUILDERS: Record<Preset, (grid: Grid, rng: Rng) => void> = {
  [Preset.aquarium]: aquarium,
  [Preset.wild]: wild,
  [Preset.volcano]: volcano,
  [Preset.antColony]: antColony,
  [Preset.kitchen]: kitchen,
  [Preset.madScience]: madScience,
}

/** Wipes the world and builds a preset into it. The rng is what keeps two loads from being identical. */
export function loadPreset(grid: Grid, preset: Preset, rng: Rng): void {
  clearGrid(grid)
  BUILDERS[preset](grid, rng)
}
