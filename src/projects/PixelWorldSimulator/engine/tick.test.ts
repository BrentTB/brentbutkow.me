import { describe, it, expect } from 'vitest'
import { Grid, MaterialId } from '../pixel-world.types'
import { cellIndex, createGrid, placeMaterial } from './grid'
import { createRng } from './rng'
import { tickWorld } from './tick'

function put(grid: Grid, x: number, y: number, material: MaterialId): number {
  const index = cellIndex(grid, x, y)
  placeMaterial(grid, index, material)
  return index
}

function run(grid: Grid, ticks: number, seed = 2024): void {
  const rng = createRng(seed)
  for (let tick = 0; tick < ticks; tick++) tickWorld(grid, rng, tick)
}

function count(grid: Grid, material: MaterialId): number {
  return grid.material.reduce((total, cell) => (cell === material ? total + 1 : total), 0)
}

/** Stone floor and side walls. */
function withVessel(width: number, height: number): Grid {
  const grid = createGrid(width, height)
  for (let x = 0; x < width; x++) put(grid, x, height - 1, MaterialId.stone)
  for (let y = 0; y < height; y++) {
    put(grid, 0, y, MaterialId.stone)
    put(grid, width - 1, y, MaterialId.stone)
  }
  return grid
}

describe('tickWorld', () => {
  it('reproduces a run exactly from the same seed', () => {
    const build = () => {
      const grid = withVessel(30, 24)
      for (let x = 4; x < 26; x++) put(grid, x, 20, MaterialId.water)
      for (let x = 10; x < 16; x++) put(grid, x, 4, MaterialId.lava)
      for (let x = 20; x < 25; x++) put(grid, x, 18, MaterialId.wood)
      put(grid, 6, 6, MaterialId.acid)
      return grid
    }

    const first = build()
    const second = build()
    run(first, 300, 5150)
    run(second, 300, 5150)

    expect(Array.from(first.material)).toEqual(Array.from(second.material))
    expect(Array.from(first.temperature)).toEqual(Array.from(second.temperature))
  })

  it('crusts lava into stone and flashes the water to steam', () => {
    const grid = withVessel(24, 20)
    for (let x = 1; x < 23; x++) {
      for (let y = 12; y < 19; y++) put(grid, x, y, MaterialId.water)
    }
    for (let x = 10; x < 14; x++) put(grid, x, 2, MaterialId.lava)

    run(grid, 400)

    expect(count(grid, MaterialId.lava)).toBe(0)
    expect(count(grid, MaterialId.stone)).toBeGreaterThan(24 + 2 * 20 - 4)
    expect(count(grid, MaterialId.steam) + count(grid, MaterialId.water)).toBeGreaterThan(0)
  })

  it('runs fire along a row of wood and leaves ash behind', () => {
    const grid = withVessel(30, 12)
    for (let x = 2; x < 28; x++) put(grid, x, 10, MaterialId.wood)
    put(grid, 2, 9, MaterialId.fire)

    run(grid, 900)

    expect(count(grid, MaterialId.wood)).toBe(0)
    expect(count(grid, MaterialId.ash)).toBeGreaterThan(10)
  })

  it('leaves wood alone with no ignition source', () => {
    const grid = withVessel(20, 12)
    for (let x = 2; x < 18; x++) put(grid, x, 10, MaterialId.wood)

    run(grid, 600)

    expect(count(grid, MaterialId.wood)).toBe(16)
    expect(count(grid, MaterialId.ash)).toBe(0)
  })

  it('floats oil on top of water', () => {
    const grid = withVessel(12, 20)
    for (let x = 1; x < 11; x++) {
      for (let y = 10; y < 19; y++) put(grid, x, y, MaterialId.water)
      put(grid, x, 2, MaterialId.oil)
      put(grid, x, 3, MaterialId.oil)
    }

    run(grid, 800)

    const lowestOil = lowestRow(grid, MaterialId.oil)
    const highestWater = highestRow(grid, MaterialId.water)
    expect(highestWater).not.toBeNull()
    expect(lowestOil).toBeLessThanOrEqual(highestWater ?? 0)
  })

  it('sends gas up and out through water', () => {
    const grid = withVessel(12, 20)
    for (let x = 1; x < 11; x++) {
      for (let y = 4; y < 19; y++) put(grid, x, y, MaterialId.water)
    }
    put(grid, 6, 17, MaterialId.methane)

    run(grid, 200)

    const methane = highestRow(grid, MaterialId.methane)
    expect(methane === null || methane < 5).toBe(true)
  })

  it('burns a pool of oil off and leaves nothing behind', () => {
    const grid = withVessel(16, 12)
    for (let x = 1; x < 15; x++) put(grid, x, 10, MaterialId.oil)
    put(grid, 7, 9, MaterialId.fire)

    run(grid, 900)

    expect(count(grid, MaterialId.oil)).toBe(0)
  })

  it('melts an ice block into water', () => {
    const grid = withVessel(12, 12)
    for (let x = 4; x < 8; x++) put(grid, x, 10, MaterialId.ice)
    for (let x = 4; x < 8; x++) put(grid, x, 9, MaterialId.lava)

    run(grid, 500)

    expect(count(grid, MaterialId.ice)).toBe(0)
  })
})

function highestRow(grid: Grid, material: MaterialId): number | null {
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (grid.material[cellIndex(grid, x, y)] === material) return y
    }
  }
  return null
}

function lowestRow(grid: Grid, material: MaterialId): number {
  for (let y = grid.height - 1; y >= 0; y--) {
    for (let x = 0; x < grid.width; x++) {
      if (grid.material[cellIndex(grid, x, y)] === material) return y
    }
  }
  return -1
}
