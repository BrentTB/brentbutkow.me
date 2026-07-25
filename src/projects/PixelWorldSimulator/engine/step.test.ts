import { describe, it, expect } from 'vitest'
import { Grid, MaterialId } from '../pixel-world.types'
import { cellIndex, createGrid } from './grid'
import { createRng } from './rng'
import { step } from './step'

function set(grid: Grid, x: number, y: number, material: MaterialId): void {
  grid.material[cellIndex(grid, x, y)] = material
}

function at(grid: Grid, x: number, y: number): number {
  return grid.material[cellIndex(grid, x, y)]
}

function count(grid: Grid, material: MaterialId): number {
  return grid.material.reduce((total, cell) => (cell === material ? total + 1 : total), 0)
}

function run(grid: Grid, ticks: number, seed = 1234): void {
  const rng = createRng(seed)
  for (let tick = 0; tick < ticks; tick++) step(grid, rng, tick)
}

/** Stone floor along the bottom row and stone walls down both sides. */
function withVessel(width: number, height: number): Grid {
  const grid = createGrid(width, height)
  for (let x = 0; x < width; x++) set(grid, x, height - 1, MaterialId.stone)
  for (let y = 0; y < height; y++) {
    set(grid, 0, y, MaterialId.stone)
    set(grid, width - 1, y, MaterialId.stone)
  }
  return grid
}

/** Topmost row holding `material` per column, or null for a column without any. */
function surfaceHeights(grid: Grid, material: MaterialId): (number | null)[] {
  return Array.from({ length: grid.width }, (_, x) => {
    for (let y = 0; y < grid.height; y++) if (at(grid, x, y) === material) return y
    return null
  })
}

describe('step', () => {
  it('reproduces a run exactly from the same seed', () => {
    const build = () => {
      const grid = withVessel(40, 30)
      for (let x = 5; x < 35; x++) {
        for (let y = 2; y < 8; y++)
          set(grid, x, y, x % 3 === 0 ? MaterialId.water : MaterialId.sand)
      }
      return grid
    }

    const first = build()
    const second = build()
    run(first, 200, 77)
    run(second, 200, 77)

    expect(Array.from(first.material)).toEqual(Array.from(second.material))
  })

  it('conserves every material — cells move, they are never created or destroyed', () => {
    const grid = withVessel(40, 30)
    for (let x = 4; x < 36; x++) {
      for (let y = 1; y < 12; y++) set(grid, x, y, y % 2 === 0 ? MaterialId.sand : MaterialId.water)
    }
    const before = {
      sand: count(grid, MaterialId.sand),
      water: count(grid, MaterialId.water),
      stone: count(grid, MaterialId.stone),
    }

    run(grid, 300)

    expect(count(grid, MaterialId.sand)).toBe(before.sand)
    expect(count(grid, MaterialId.water)).toBe(before.water)
    expect(count(grid, MaterialId.stone)).toBe(before.stone)
  })

  it('settles sand with nothing hanging in the air', () => {
    const grid = withVessel(30, 40)
    for (let y = 2; y < 20; y++) set(grid, 15, y, MaterialId.sand)

    run(grid, 400)

    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (at(grid, x, y) !== MaterialId.sand) continue
        const below = at(grid, x, y + 1)
        expect(below === MaterialId.sand || below === MaterialId.stone).toBe(true)
      }
    }
  })

  it('levels water across a vessel', () => {
    const grid = withVessel(40, 30)
    for (let x = 2; x < 8; x++) {
      for (let y = 4; y < 28; y++) set(grid, x, y, MaterialId.water)
    }

    run(grid, 1500)

    const surfaces = surfaceHeights(grid, MaterialId.water).filter(
      (height): height is number => height !== null
    )
    expect(Math.max(...surfaces) - Math.min(...surfaces)).toBeLessThanOrEqual(1)
  })

  it('packs a poured liquid solid, leaving no air trapped under water', () => {
    const grid = withVessel(40, 30)
    for (let x = 2; x < 8; x++) {
      for (let y = 4; y < 28; y++) set(grid, x, y, MaterialId.water)
    }

    run(grid, 1500)

    for (let y = 0; y < grid.height - 1; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (at(grid, x, y) !== MaterialId.water) continue
        expect(at(grid, x, y + 1)).not.toBe(MaterialId.empty)
      }
    }
  })

  it('sinks sand through water', () => {
    const grid = withVessel(20, 30)
    for (let x = 1; x < 19; x++) {
      for (let y = 10; y < 29; y++) set(grid, x, y, MaterialId.water)
    }
    for (let x = 8; x < 12; x++) set(grid, x, 2, MaterialId.sand)

    run(grid, 600)

    // Every grain ends below the water surface in its own column.
    const waterRows = surfaceHeights(grid, MaterialId.water)
    expect(count(grid, MaterialId.sand)).toBe(4)
    expect(waterRows.filter((row) => row !== null).length).toBeGreaterThan(10)
    for (let x = 0; x < grid.width; x++) {
      for (let y = 0; y < grid.height; y++) {
        if (at(grid, x, y) !== MaterialId.sand) continue
        const waterTop = waterRows[x]
        if (waterTop !== null) expect(y).toBeGreaterThan(waterTop)
      }
    }
  })

  it('never displaces static material', () => {
    const grid = createGrid(10, 10)
    for (let x = 0; x < 10; x++) set(grid, x, 5, MaterialId.stone)
    set(grid, 4, 1, MaterialId.sand)
    set(grid, 6, 1, MaterialId.water)

    run(grid, 200)

    for (let x = 0; x < 10; x++) expect(at(grid, x, 5)).toBe(MaterialId.stone)
    expect(count(grid, MaterialId.stone)).toBe(10)
    for (let y = 6; y < 10; y++) {
      for (let x = 0; x < 10; x++) expect(at(grid, x, y)).toBe(MaterialId.empty)
    }
  })

  it('builds a pile centred on where it fell, without drifting sideways', () => {
    const grid = withVessel(41, 30)
    for (let y = 1; y < 20; y++) set(grid, 20, y, MaterialId.sand)

    run(grid, 600)

    let weighted = 0
    let grains = 0
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (at(grid, x, y) !== MaterialId.sand) continue
        weighted += x
        grains++
      }
    }
    expect(Math.abs(weighted / grains - 20)).toBeLessThan(1)
  })
})
