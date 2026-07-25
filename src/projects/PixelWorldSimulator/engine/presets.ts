import { Grid, MaterialId } from '../pixel-world.types'
import { cellIndex, clearGrid, placeMaterial } from './grid'
import { Rng } from './rng'

export const Preset = {
  aquarium: 'aquarium',
  wild: 'wild',
  volcano: 'volcano',
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

  // Terraces climbing out of the bed: a tank whose whole top half is plain water has nothing to look at,
  // and weed growing on the ledges gives the fish a reason to be up there.
  const span = right - wall - (left + wall)
  const ledges = 3
  for (let i = 1; i <= ledges; i++) {
    const cx = left + wall + Math.round((span * i) / (ledges + 1))
    // Broad and low. Tall and narrow gave three stone needles standing in a tank, which looks like a mistake
    // rather than a reef.
    const lift = Math.round((floor - surface) * (0.12 + rng.next() * 0.2))
    const reach = Math.max(8, Math.round(span * (0.06 + rng.next() * 0.06)))

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
  }

  // Fish spread through the depth rather than hugging the floor, now that there is food up there.
  const shoal = Math.floor((right - left) / 7)
  for (let i = 1; i <= 6; i++) {
    put(
      grid,
      left + shoal * i,
      surface + 6 + Math.floor(rng.next() * (floor - surface - 12)),
      MaterialId.fish
    )
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
    const top = Math.round(
      peak + (floor - peak) * across * across * 0.9 + skin[Math.abs(x) % width]
    )
    slope[x] = top
    fill(grid, x, top, x, floor - 1, MaterialId.stone)
    if (rng.next() < 0.3) put(grid, x, top, MaterialId.gravel)
    if (rng.next() < 0.1) put(grid, x, top + 1, MaterialId.gravel)
  }

  // The throat: wider at the bottom than the top, wandering rather than plumb, opening into a crater bowl.
  const crater = slope[middle] + 3
  for (let y = crater; y < floor - 4; y++) {
    const bore = 1 + Math.round(((y - crater) / (floor - crater)) * 3)
    const lean = Math.round(Math.sin(y / 9) * 2)
    fill(grid, middle + lean - bore, y, middle + lean + bore, y, MaterialId.empty)
  }
  fill(grid, middle - 5, crater, middle + 5, crater + 2, MaterialId.empty)
  // A breach in the rim on one side. A closed crater just fills and sits there, because the source cannot
  // push past its own lava, and a volcano that never spills is a warm rock.
  const breach = rng.next() < 0.5 ? -1 : 1
  for (let i = 1; i <= 7; i++) {
    const x = middle + breach * (4 + i)
    fill(grid, x, crater, x, crater + 1 + Math.floor(i / 3), MaterialId.empty)
  }

  // The source sits in the crater itself, with a drop of lava beside it to teach it what to make. A source
  // can only push its output about twenty cells to find space, so buried at the bottom of a throat full of
  // lava it has nowhere to put anything and the mountain goes quiet. Up here the crater and the breach are
  // right next to it, so it keeps pouring.
  put(grid, middle, crater + 2, MaterialId.source)
  put(grid, middle + 1, crater + 2, MaterialId.lava)

  // A chamber down in the roots, for the glow through the rock rather than for the flow.
  fill(grid, middle - 5, floor - 12, middle + 5, floor - 4, MaterialId.lava)

  // Caves out near the feet of the mountain, well away from the vent: slimes sitting over the chamber simply
  // cooked. Each gets a carcass to start on, and they can walk out through the mouth of the cave.
  for (let side = -1; side <= 1; side += 2) {
    const cx = middle + side * Math.floor(spread * 0.82)
    const cy = floor - 6
    boulder(grid, cx, cy, 4 + Math.floor(rng.next() * 3), rng, MaterialId.empty)
    put(grid, cx, cy + 2, MaterialId.meat)
    put(grid, cx - side, cy + 1, MaterialId.meat)
    put(grid, cx, cy, MaterialId.slime)
    put(grid, cx + side, cy, MaterialId.slime)
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

  // A pocket of methane in the rock, because a volcano should have something to burp.
  const gasAt = middle - Math.floor(spread * 0.45)
  boulder(
    grid,
    gasAt,
    slope[Math.max(0, Math.min(width - 1, gasAt))] + 6,
    3,
    rng,
    MaterialId.methane
  )
}

const BUILDERS: Record<Preset, (grid: Grid, rng: Rng) => void> = {
  [Preset.aquarium]: aquarium,
  [Preset.wild]: wild,
  [Preset.volcano]: volcano,
}

/** Wipes the world and builds a preset into it. The rng is what keeps two loads from being identical. */
export function loadPreset(grid: Grid, preset: Preset, rng: Rng): void {
  clearGrid(grid)
  BUILDERS[preset](grid, rng)
}
