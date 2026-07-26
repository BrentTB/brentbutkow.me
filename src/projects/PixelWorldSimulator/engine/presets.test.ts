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

    // A tank that leaks is not a tank. Some slop off the open top pool as the vine grows and the water levels
    // is expected; a real drain would empty a chamber, not shave a percent or two.
    expect(count(grid, MaterialId.water)).toBeGreaterThan(before * 0.9)
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

  it('raises reef mounds in the lower chamber, differently each load', () => {
    // Reefs: stone crests standing well above the floor. The scan starts below the dividing shelf so the shelf
    // is not mistaken for one, and the height cut clears short boulders sunk in the sand bed. Counting exact
    // ledges is noisy on a wavy crest, so this measures how much reef there is and how tall it gets.
    const reef = (grid: Grid): { width: number; tallest: number } => {
      const floorY = grid.height - Math.floor(grid.height * 0.06)
      const belowShelf = Math.floor(grid.height * 0.42) + 6
      let width = 0
      let tallest = 0
      for (let x = 0; x < grid.width; x++) {
        let top = -1
        for (let y = belowShelf; y < floorY; y++) {
          if (grid.material[cellIndex(grid, x, y)] === MaterialId.stone) {
            top = y
            break
          }
        }
        if (top >= belowShelf && top < floorY - 12) {
          width++
          tallest = Math.max(tallest, floorY - top)
        }
      }
      return { width, tallest }
    }

    const widths = new Set<number>()
    for (let seed = 1; seed <= 8; seed++) {
      const { width, tallest } = reef(built(seed))
      // Real reef, spanning real width and standing well up.
      expect(width).toBeGreaterThan(20)
      expect(tallest).toBeGreaterThan(25)
      widths.add(width)
    }
    // A different arrangement each load, not one stamped-out shape.
    expect(widths.size).toBeGreaterThan(1)
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
    // Two sources in the crater and more down the shaft: a lone source trickles slowly enough that the lava
    // crusts to stone and plugs the vent.
    expect(count(grid, MaterialId.source)).toBeGreaterThan(2)
    expect(count(grid, MaterialId.slime)).toBeGreaterThan(1)
    expect(count(grid, MaterialId.tnt) + count(grid, MaterialId.gunpowder)).toBeGreaterThan(10)
    expect(count(grid, MaterialId.water)).toBeGreaterThan(50)
  })

  it('pours lava down both faces, and never plugs its vent with stone', { timeout: 20_000 }, () => {
    // A few seeds, both sides. The crater sources are dormant until the climbing column reaches them, so the
    // spill comes after the eruption has risen rather than from the first tick; the soak covers that climb.
    for (const seed of [4, 5, 7]) {
      const grid = createGrid(200, 120)
      loadPreset(grid, Preset.volcano, createRng(seed))
      const mid = Math.floor(200 * 0.46)

      soak(grid, 600)

      let left = 0
      let right = 0
      let plug = 0
      for (let y = 0; y < grid.height; y++) {
        for (let x = 0; x < grid.width; x++) {
          if (grid.material[cellIndex(grid, x, y)] !== MaterialId.lava) continue
          if (x < mid - 10) left++
          else if (x > mid + 10) right++
        }
      }
      // The crater lips and the rim above them are lava or air, not a grey stone plug from a source that
      // learned to pump stone off the shaft walls.
      for (let y = 20; y < 40; y++) {
        if (grid.material[cellIndex(grid, mid, y)] === MaterialId.stone) plug++
      }
      expect(left).toBeGreaterThan(0)
      expect(right).toBeGreaterThan(0)
      expect(plug).toBeLessThan(6)
    }
  })

  it('digs its slimes an exit rather than sealing them in a pocket', { timeout: 20_000 }, () => {
    const grid = createGrid(200, 120)
    loadPreset(grid, Preset.volcano, createRng(2))

    // Every slime should have somewhere to move: a walker sealed in solid stone is stuck, so the caves are
    // tunnelled out to daylight.
    const canMove = (index: number) => {
      const x = index % grid.width
      const y = Math.floor(index / grid.width)
      for (const [dx, dy] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ]) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || nx >= grid.width || ny < 0 || ny >= grid.height) continue
        const m = grid.material[cellIndex(grid, nx, ny)]
        if (m === MaterialId.empty || m === MaterialId.slime) return true
      }
      return false
    }

    let free = 0
    let slimes = 0
    for (let i = 0; i < grid.material.length; i++) {
      if (grid.material[i] !== MaterialId.slime) continue
      slimes++
      if (canMove(i)) free++
    }
    expect(slimes).toBeGreaterThan(0)
    expect(free).toBe(slimes)
  })

  it('does not cook its own slimes on the way in', () => {
    const grid = createGrid(200, 120)
    loadPreset(grid, Preset.volcano, createRng(3))

    soak(grid, 600)

    // They live in caves out at the feet of the mountain. Over the chamber they simply cooked.
    expect(count(grid, MaterialId.slime)).toBeGreaterThan(0)
  })
})

describe('the ant colony preset', () => {
  function builtColony(seed = 1): Grid {
    const grid = createGrid(GRID_WIDTH, GRID_HEIGHT)
    loadPreset(grid, Preset.antColony, createRng(seed))
    return grid
  }

  it('arrives as leafy trunks with ants along the ground', () => {
    const grid = builtColony()

    // Trunks to crawl, leaves to graze, and a scatter of ants to do the building.
    expect(count(grid, MaterialId.wood)).toBeGreaterThan(100)
    expect(count(grid, MaterialId.plant)).toBeGreaterThan(20)
    expect(count(grid, MaterialId.ant)).toBeGreaterThan(4)
  })

  it('sets its ants down on a surface, not floating in mid-air', () => {
    const grid = builtColony()

    // An ant needs something solid under it to crawl from; dropped into open air it just falls. Each one
    // should start on the ground.
    for (let i = 0; i < grid.material.length; i++) {
      if (grid.material[i] !== MaterialId.ant) continue
      const below = i + grid.width
      expect(below).toBeLessThan(grid.material.length)
      expect(grid.material[below]).not.toBe(MaterialId.empty)
    }
  })

  it('is still boring galleries a while after it is dropped in', { timeout: 20_000 }, () => {
    const grid = createGrid(140, 90)
    loadPreset(grid, Preset.antColony, createRng(2))
    const woodStart = count(grid, MaterialId.wood)

    soak(grid, 1000)

    // The ants graze the ground bushes and keep working, so the colony is still alive, and it has opened
    // real galleries into the logs — there is less solid wood than the logs started as.
    expect(count(grid, MaterialId.ant)).toBeGreaterThan(0)
    expect(count(grid, MaterialId.wood)).toBeLessThan(woodStart)
  })

  it('comes out different every time it is loaded', () => {
    expect([...builtColony(2).material]).not.toEqual([...builtColony(1).material])
  })
})
