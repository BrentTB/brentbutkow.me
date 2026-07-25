import { Grid, MaterialId } from '../pixel-world.types'
import { cellIndex, clearGrid, placeMaterial } from './grid'

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

/**
 * A stone tank of water with a bed of algae and a few fish: the food chain running on its own, without
 * anyone having to draw a tank first. Sized as a share of the grid so it fits whatever the world is.
 */
function aquarium(grid: Grid): void {
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

  // Sand and a few rocks, so the tank has a bottom rather than a line.
  fill(grid, left + wall + 1, floor - 3, right - wall - 1, floor - 1, MaterialId.sand)
  for (let i = 1; i <= 3; i++) {
    const rock = left + Math.floor(((right - left) * i) / 4)
    fill(grid, rock - 3, floor - 6, rock + 3, floor - 4, MaterialId.stone)
  }

  // A bed along the bottom, spaced out: algae only divides where it has room, so a solid row would sit
  // there doing nothing.
  for (let x = left + wall + 3; x < right - wall - 3; x += 4) {
    placeMaterial(grid, cellIndex(grid, x, floor - 4), MaterialId.algae)
  }

  // Fish start near the bed, not adrift in open water: they have to be able to find their first meal.
  const shoal = Math.floor((right - left) / 6)
  for (let i = 1; i <= 5; i++) {
    placeMaterial(grid, cellIndex(grid, left + shoal * i, floor - 8), MaterialId.fish)
  }
}

/**
 * Open country with a pond sunk into it: soil to burrow through, plants to graze, bugs on the ground, worms
 * under it and birds over the top, with fish and algae in the water. The two halves share the same world on
 * purpose — the sky is wasted space in a tank, and the pond gives the birds something to dive at.
 */
function wild(grid: Grid): void {
  const { width, height } = grid
  const ground = Math.floor(height * 0.62)
  const bedrock = height - Math.floor(height * 0.08)
  const pond = { left: Math.floor(width * 0.55), right: Math.floor(width * 0.88) }
  const pondFloor = bedrock - 3

  fill(grid, 0, bedrock, width - 1, height - 1, MaterialId.stone)
  fill(grid, 0, ground, width - 1, bedrock - 1, MaterialId.dirt)
  // A sandy stretch on the left, which is where the worms show up best against the dirt.
  fill(grid, 0, ground, Math.floor(width * 0.22), ground + 4, MaterialId.sand)
  // Grass: a band of plant across the land, which is the only food a bug can reach. Shoots along the pond
  // edge grow into the water instead, where something that walks on surfaces cannot follow. Mud is not an
  // option here either, because mud is a liquid: a damp field flowed over the bugs and suffocated them.
  fill(grid, Math.floor(width * 0.24), ground - 1, pond.left - 2, ground + 1, MaterialId.plant)

  // The pond: a dip in the ground, lined with stone. Bare dirt drinks a pond dry — every cell it touches
  // turns to mud and takes the water with it — so a rocky pool is the only kind that lasts.
  fill(grid, pond.left, ground, pond.right, pondFloor + 2, MaterialId.stone)
  fill(grid, pond.left + 2, ground, pond.right - 2, pondFloor, MaterialId.empty)
  fill(grid, pond.left + 2, ground + 2, pond.right - 2, pondFloor, MaterialId.water)

  // Plants along the water's edge, where they can actually spread: a plant only grows against water, so a
  // row of them out on dry ground is a fixed number of meals and then a field of starved bugs.
  for (let y = ground + 1; y < pondFloor - 1; y += 3) {
    placeMaterial(grid, cellIndex(grid, pond.left - 1, y), MaterialId.plant)
    placeMaterial(grid, cellIndex(grid, pond.right + 1, y), MaterialId.plant)
  }
  // A spring buried under the field, with a drop of water beside it to teach it what to make. A source
  // produces forever, so the field stays damp: wet soil is the only thing grass can grow into, and without
  // it the lawn is a fixed number of meals and the bugs starve on bare dirt within a minute.
  const spring = cellIndex(grid, Math.floor(width * 0.38), ground + 3)
  placeMaterial(grid, spring, MaterialId.source)
  placeMaterial(grid, spring + 1, MaterialId.water)

  for (let x = pond.left + 4; x < pond.right - 4; x += 5) {
    placeMaterial(grid, cellIndex(grid, x, pondFloor - 1), MaterialId.algae)
  }
  // A few more fish than feels necessary: the ones that wander to the surface get picked off by the birds,
  // and a pond that empties in the first minute is not much of a pond.
  for (let i = 1; i <= 6; i++) {
    const x = pond.left + Math.floor(((pond.right - pond.left) * i) / 7)
    placeMaterial(grid, cellIndex(grid, x, pondFloor - 3), MaterialId.fish)
  }

  // Worms inside the soil, bugs on top of it, birds above everything.
  for (let i = 1; i <= 5; i++) {
    placeMaterial(grid, cellIndex(grid, Math.floor((width * i) / 12), ground + 6), MaterialId.worm)
  }
  // Bugs go along the damp field where the plants are, birds start low enough to see the ground: both
  // starve otherwise, a few cells from a meal.
  for (let x = Math.floor(width * 0.27); x < pond.left - 4; x += 6) {
    placeMaterial(grid, cellIndex(grid, x, ground - 1), MaterialId.bug)
  }
  // Two, not a flock: three cleared the bugs and the pond inside a minute.
  for (let i = 1; i <= 2; i++) {
    placeMaterial(grid, cellIndex(grid, Math.floor((width * i) / 3), ground - 10), MaterialId.bird)
  }
}

const BUILDERS: Record<Preset, (grid: Grid) => void> = {
  [Preset.aquarium]: aquarium,
  [Preset.wild]: wild,
}

/** Wipes the world and builds a preset into it. */
export function loadPreset(grid: Grid, preset: Preset): void {
  clearGrid(grid)
  BUILDERS[preset](grid)
}
