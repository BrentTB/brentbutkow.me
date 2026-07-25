import { Grid, MaterialId } from '../pixel-world.types'
import { cellIndex, clearGrid, placeMaterial } from './grid'
import { Rng } from './rng'

export const Preset = {
  aquarium: 'aquarium',
  wild: 'wild',
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
 * A tank of water with a bed of algae and a few fish: the food chain running on its own, without anyone
 * having to draw a tank first. Sized as a share of the grid so it fits whatever the world is.
 */
function aquarium(grid: Grid, rng: Rng): void {
  const { width, height } = grid
  const left = Math.floor(width * 0.1)
  const right = width - left
  const floor = height - Math.floor(height * 0.06)
  const surface = Math.floor(height * 0.22)
  const wall = Math.max(2, Math.floor(width * 0.01))

  fill(grid, left, floor, right, height - 1, MaterialId.stone)
  fill(grid, left, surface, left + wall, floor, MaterialId.stone)
  fill(grid, right - wall, surface, right, floor, MaterialId.stone)
  fill(grid, left + wall + 1, surface + 2, right - wall - 1, floor - 1, MaterialId.water)

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

  const shoal = Math.floor((right - left) / 6)
  for (let i = 1; i <= 5; i++) {
    put(grid, left + shoal * i, floor - 8 - Math.floor(rng.next() * 6), MaterialId.fish)
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

  fill(grid, 0, bedrock, width - 1, height - 1, MaterialId.stone)
  for (let x = 0; x < width; x++) fill(grid, x, ground[x], x, bedrock - 1, MaterialId.dirt)

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
    for (let y = ground[Math.max(0, Math.min(width - 1, x))] - 1; y <= bedrock; y++) {
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

const BUILDERS: Record<Preset, (grid: Grid, rng: Rng) => void> = {
  [Preset.aquarium]: aquarium,
  [Preset.wild]: wild,
}

/** Wipes the world and builds a preset into it. The rng is what keeps two loads from being identical. */
export function loadPreset(grid: Grid, preset: Preset, rng: Rng): void {
  clearGrid(grid)
  BUILDERS[preset](grid, rng)
}
