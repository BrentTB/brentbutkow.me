import { Grid, MaterialId } from '../pixel-world.types'
import { cellIndex, clearGrid, placeMaterial } from './grid'
import { Rng } from './rng'

export const Preset = {
  aquarium: 'aquarium',
  wild: 'wild',
  volcano: 'volcano',
  antColony: 'antColony',
} as const
export type Preset = (typeof Preset)[keyof typeof Preset]

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

/** A trunk of wood with a ragged canopy of plant over it. */
function tree(grid: Grid, x: number, groundY: number, height: number, rng: Rng): void {
  for (let i = 0; i < height; i++) {
    put(grid, x, groundY - i, MaterialId.wood)
    // A slight lean near the top, so no two trees look stamped from the same mould.
    if (i > height * 0.6 && rng.next() < 0.4) put(grid, x + 1, groundY - i, MaterialId.wood)
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
  options: { stopAbove?: (col: number) => number; branch?: number; depth?: number } = {}
): void {
  const { stopAbove, branch = 0, depth = 0 } = options
  let cx = x
  let cy = y
  for (let i = 0; i < length; i++) {
    if (cx < 0 || cx >= grid.width || cy < 0 || cy >= grid.height) return
    if (stopAbove !== undefined && cy < stopAbove(cx)) return

    put(grid, cx, cy, MaterialId.empty)
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

    cx += dx
    cy += dy
    if (rng.next() < 0.4) cx += rng.next() < 0.5 ? 1 : -1
    if (rng.next() < 0.3) cy += rng.next() < 0.5 ? 1 : -1
  }
}

/**
 * A tank of water with a bed of algae and a few fish: the food chain running on its own, without anyone
 * having to draw a tank first. Sized as a share of the grid so it fits whatever the world is.
 */
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
  for (let x = 0; x < width; x++) {
    fill(grid, x, rock[x], x, height - 1, MaterialId.stone)
    fill(grid, x, ground[x], x, rock[x] - 1, MaterialId.dirt)
    if (rng.next() < 0.3) put(grid, x, rock[x] - 1, MaterialId.gravel)
    if (rng.next() < 0.15) put(grid, x, rock[x] - 2, MaterialId.gravel)
  }

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
  for (let x = Math.floor(width * 0.24); x < pond.left - 2; x++) {
    const tufts = 1 + (rng.next() < 0.5 ? 1 : 0) + (rng.next() < 0.2 ? 1 : 0)
    for (let i = 0; i < tufts; i++) put(grid, x, ground[x] - i, MaterialId.plant)
  }

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
    vein(grid, cx, cy - 2, side, -1, 30, rng, {
      stopAbove: (col) => slope[Math.max(0, Math.min(width - 1, col))],
    })
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

  // A pocket of oil sealed deep in the rock, well below the surface. Methane would seep straight up out of
  // the mountain and be gone; oil sits in its pocket and waits for a lava flow to find it and catch.
  const oilAt = middle - Math.floor(spread * 0.5)
  const oilX = Math.max(0, Math.min(width - 1, oilAt))
  boulder(grid, oilX, Math.round((slope[oilX] + floor) / 2), 3, rng, MaterialId.oil)
}

/**
 * A plain ant colony: a couple of leafy wooden trunks on open ground, each seeded with a nest of ants
 * down in the wood. Deliberately basic — it exists to show the ants tunnelling, and there is no point
 * shaping it carefully while their behaviour is still being tuned. The leaves are the one thing that
 * earns its place: an ant grazes them for the energy a colony needs to keep spreading.
 */
function antColony(grid: Grid, rng: Rng): void {
  const { width, height } = grid
  const groundY = height - Math.max(2, Math.round(height * 0.08))

  fill(grid, 0, groundY + 1, width - 1, height - 1, MaterialId.stone)
  fill(grid, 0, groundY - 1, width - 1, groundY, MaterialId.dirt)

  const trunks = Math.max(2, Math.round(width / 150))
  for (let t = 0; t < trunks; t++) {
    const tx = Math.round(((t + 1) / (trunks + 1)) * width)
    const half = Math.max(4, Math.round(width * 0.05))
    const top = Math.round(height * (0.24 + rng.next() * 0.1))

    // A fat block of trunk to gallery through, its top edge roughed up so it is not a brick.
    for (let x = tx - half; x <= tx + half; x++) {
      const jitter = Math.round((rng.next() - 0.5) * 3)
      fill(grid, x, top + jitter, x, groundY, MaterialId.wood)
    }
    boulder(grid, tx, top, half + 2, rng, MaterialId.plant)

    // A nest of ants down in the lower half of the trunk, ready to dig out from.
    for (let i = 0; i < 16; i++) {
      const ax = tx + Math.round((rng.next() - 0.5) * (half * 2 - 2))
      const ay = groundY - 2 - Math.round(rng.next() * (groundY - top - 4))
      put(grid, ax, ay, MaterialId.ant)
    }
  }
}

const BUILDERS: Record<Preset, (grid: Grid, rng: Rng) => void> = {
  [Preset.aquarium]: aquarium,
  [Preset.wild]: wild,
  [Preset.volcano]: volcano,
  [Preset.antColony]: antColony,
}

/** Wipes the world and builds a preset into it. The rng is what keeps two loads from being identical. */
export function loadPreset(grid: Grid, preset: Preset, rng: Rng): void {
  clearGrid(grid)
  BUILDERS[preset](grid, rng)
}
