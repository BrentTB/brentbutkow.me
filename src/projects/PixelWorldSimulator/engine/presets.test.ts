import { describe, it, expect } from 'vitest'
import { Grid, MaterialId } from '../pixel-world.types'
import { GRID_HEIGHT, GRID_WIDTH } from '../data'
import { cellIndex, createGrid, placeMaterial } from './grid'
import { Preset, loadPreset } from './presets'
import { tickWorld } from './tick'
import { createRng } from './rng'

function count(grid: Grid, material: MaterialId): number {
  let total = 0
  for (const cell of grid.material) if (cell === material) total++
  return total
}

function built(seed = 1): Grid {
  const grid = createGrid(GRID_WIDTH, GRID_HEIGHT)
  loadPreset(grid, Preset.aquarium, createRng(seed))
  return grid
}

function builtWild(seed = 1): Grid {
  const grid = createGrid(GRID_WIDTH, GRID_HEIGHT)
  loadPreset(grid, Preset.wild, createRng(seed))
  return grid
}

/** The same tank at a size a test can afford to run for thousands of ticks. */
function smallTank(): Grid {
  const grid = createGrid(100, 64)
  loadPreset(grid, Preset.aquarium, createRng(1))
  return grid
}

function soak(grid: Grid, ticks: number): void {
  const rng = createRng(2)
  for (let tick = 0; tick < ticks; tick++) tickWorld(grid, rng, tick)
}

describe('the aquarium preset', () => {
  it('arrives holding water, algae and fish', () => {
    const grid = built()

    expect(count(grid, MaterialId.water)).toBeGreaterThan(1000)
    expect(count(grid, MaterialId.algae)).toBeGreaterThan(5)
    expect(count(grid, MaterialId.fish)).toBeGreaterThanOrEqual(5)
    expect(count(grid, MaterialId.stone)).toBeGreaterThan(100)
  })

  it('holds its water in, rather than pouring it across the floor', () => {
    const grid = smallTank()
    const before = count(grid, MaterialId.water)

    soak(grid, 400)

    // A tank that leaks is not a tank: the walls have to reach above the waterline.
    expect(count(grid, MaterialId.water)).toBeGreaterThan(before * 0.95)
  })

  it('still has a food chain running long after it was dropped in', { timeout: 20_000 }, () => {
    const grid = smallTank()

    soak(grid, 2000)

    // The whole point of the preset: it runs itself. Fish placed adrift in open water starved before they
    // found the bed, and a bed of algae with nothing grazing it is not a food chain.
    expect(count(grid, MaterialId.algae)).toBeGreaterThan(0)
    expect(count(grid, MaterialId.fish)).toBeGreaterThan(0)
  })

  it('wipes whatever was there before', () => {
    const grid = createGrid(GRID_WIDTH, GRID_HEIGHT)
    placeMaterial(grid, cellIndex(grid, 2, 2), MaterialId.lava)

    loadPreset(grid, Preset.aquarium, createRng(1))

    expect(count(grid, MaterialId.lava)).toBe(0)
  })

  it('comes out different every time it is loaded', () => {
    const first = built(1)
    const second = built(2)

    // A preset that lands identically every time reads as a stamp rather than a place.
    expect([...second.material]).not.toEqual([...first.material])
  })

  it('fits inside whatever size of world it is given', () => {
    const small = createGrid(60, 40)
    loadPreset(small, Preset.aquarium, createRng(1))

    expect(count(small, MaterialId.water)).toBeGreaterThan(50)
    expect(count(small, MaterialId.fish)).toBeGreaterThanOrEqual(4)
  })
})

describe('the wild preset', () => {
  it('arrives with the whole cast in it', () => {
    const grid = builtWild()

    for (const material of [
      MaterialId.bug,
      MaterialId.worm,
      MaterialId.bird,
      MaterialId.fish,
      MaterialId.algae,
      MaterialId.plant,
    ]) {
      expect(count(grid, material)).toBeGreaterThan(0)
    }
  })

  it('puts each creature somewhere it can live', () => {
    const grid = builtWild()

    // Worms underground, bugs on top of it, birds in open air: seeded in the wrong medium they are simply
    // corpses with extra steps.
    const under = (material: MaterialId) => {
      for (let y = 0; y < grid.height - 1; y++) {
        for (let x = 0; x < grid.width; x++) {
          if (grid.material[cellIndex(grid, x, y)] !== material) continue
          return grid.material[cellIndex(grid, x, y + 1)]
        }
      }
      return MaterialId.empty
    }

    expect([MaterialId.dirt, MaterialId.sand]).toContain(under(MaterialId.worm))
    expect(under(MaterialId.bird)).toBe(MaterialId.empty)
  })

  it('has water that stays in its pond', () => {
    const grid = createGrid(120, 80)
    loadPreset(grid, Preset.wild, createRng(1))
    const before = count(grid, MaterialId.water)

    soak(grid, 400)

    // Some soaks into the bank as mud, which is the point of a bank, but it should not drain away.
    expect(count(grid, MaterialId.water)).toBeGreaterThan(before * 0.6)
  })

  it('still has a world going a while later', { timeout: 20_000 }, () => {
    const grid = createGrid(120, 80)
    loadPreset(grid, Preset.wild, createRng(1))

    soak(grid, 2000)

    // Plants and worms are the load-bearing pair: whether the birds are still around at this size is up to
    // the run, since a small world cannot feed many predators.
    expect(count(grid, MaterialId.plant)).toBeGreaterThan(0)
    expect(count(grid, MaterialId.worm)).toBeGreaterThan(0)
    expect(count(grid, MaterialId.water)).toBeGreaterThan(50)
  })

  it('builds a landscape rather than a set of boxes', () => {
    const grid = builtWild()

    // The ground line has to actually vary, and there should be wood in the world: a flat horizon with
    // nothing standing on it was the complaint that produced all of this.
    const surface = new Set<number>()
    for (let x = 0; x < grid.width; x += 4) {
      for (let y = 0; y < grid.height; y++) {
        if (grid.material[cellIndex(grid, x, y)] === MaterialId.empty) continue
        surface.add(y)
        break
      }
    }

    expect(surface.size).toBeGreaterThan(3)
    expect(count(grid, MaterialId.wood)).toBeGreaterThan(10)
  })
})

describe('the volcano preset', () => {
  function builtVolcano(seed = 3): Grid {
    const grid = createGrid(GRID_WIDTH, GRID_HEIGHT)
    loadPreset(grid, Preset.volcano, createRng(seed))
    return grid
  }

  it('arrives with a mountain, a vent, charges and slimes', () => {
    const grid = builtVolcano()

    expect(count(grid, MaterialId.stone)).toBeGreaterThan(1000)
    expect(count(grid, MaterialId.lava)).toBeGreaterThan(20)
    expect(count(grid, MaterialId.source)).toBe(1)
    expect(count(grid, MaterialId.slime)).toBeGreaterThan(1)
    expect(count(grid, MaterialId.tnt) + count(grid, MaterialId.gunpowder)).toBeGreaterThan(10)
    expect(count(grid, MaterialId.water)).toBeGreaterThan(50)
  })

  it('keeps erupting rather than filling up and going quiet', { timeout: 20_000 }, () => {
    const grid = createGrid(200, 120)
    loadPreset(grid, Preset.volcano, createRng(3))
    const before = count(grid, MaterialId.lava)

    soak(grid, 1500)

    // A source can only push its output about twenty cells to find space. Buried at the bottom of a throat
    // full of lava it has nowhere to put anything, and the mountain goes quiet on load.
    expect(count(grid, MaterialId.lava)).toBeGreaterThan(before)
  })

  it('does not cook its own slimes on the way in', () => {
    const grid = createGrid(200, 120)
    loadPreset(grid, Preset.volcano, createRng(3))

    soak(grid, 600)

    // They live in caves out at the feet of the mountain. Over the chamber they simply cooked.
    expect(count(grid, MaterialId.slime)).toBeGreaterThan(0)
  })
})
