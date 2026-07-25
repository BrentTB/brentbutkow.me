import { describe, it, expect } from 'vitest'
import { Grid, MaterialId } from '../pixel-world.types'
import { cellIndex, createGrid, placeMaterial } from './grid'
import { MATERIALS } from './materials'
import { createRng } from './rng'
import { applyReactions } from './reactions'
import { tickWorld } from './tick'

function put(grid: Grid, x: number, y: number, material: MaterialId): number {
  const index = cellIndex(grid, x, y)
  placeMaterial(grid, index, material)
  return index
}

function react(grid: Grid, ticks: number, seed = 7): void {
  const rng = createRng(seed)
  for (let tick = 0; tick < ticks; tick++) applyReactions(grid, rng)
}

function count(grid: Grid, material: MaterialId): number {
  return grid.material.reduce((total, cell) => (cell === material ? total + 1 : total), 0)
}

describe('acid', () => {
  it('eats a neighbour it touches', () => {
    const grid = createGrid(5, 5)
    put(grid, 2, 2, MaterialId.acid)
    const sand = put(grid, 2, 3, MaterialId.sand)

    react(grid, 200)

    expect(grid.material[sand]).toBe(MaterialId.empty)
  })

  it('leaves stone and glass alone', () => {
    const grid = createGrid(5, 5)
    const acid = put(grid, 2, 2, MaterialId.acid)
    const stone = put(grid, 2, 3, MaterialId.stone)
    const glass = put(grid, 2, 1, MaterialId.glass)

    react(grid, 500)

    expect(grid.material[stone]).toBe(MaterialId.stone)
    expect(grid.material[glass]).toBe(MaterialId.glass)
    expect(grid.material[acid]).toBe(MaterialId.acid)
  })

  it('spends one charge per cell it eats', () => {
    const grid = createGrid(5, 5)
    const acid = put(grid, 2, 2, MaterialId.acid)
    put(grid, 2, 3, MaterialId.sand)
    const charges = grid.data[acid]

    react(grid, 200)

    expect(grid.data[acid]).toBe(charges - 1)
  })

  it('digs down through sand until its charges run out', () => {
    const uses = MATERIALS[MaterialId.acid].uses ?? 0
    const grid = createGrid(20, 30)
    for (let x = 0; x < 20; x++) {
      for (let y = 4; y < 30; y++) put(grid, x, y, MaterialId.sand)
    }
    put(grid, 10, 3, MaterialId.acid)
    const sandBefore = count(grid, MaterialId.sand)

    // The full tick, because a drop only reaches fresh sand by sinking into the hole it just made.
    const rng = createRng(11)
    for (let tick = 0; tick < 3000; tick++) tickWorld(grid, rng, tick)

    expect(count(grid, MaterialId.acid)).toBe(0)
    const eaten = sandBefore - count(grid, MaterialId.sand)
    expect(eaten).toBe(uses)
  })
})

describe('plants', () => {
  it('grows into adjacent water', () => {
    const grid = createGrid(7, 7)
    put(grid, 3, 4, MaterialId.plant)
    for (let y = 0; y < 4; y++) put(grid, 3, y, MaterialId.water)

    react(grid, 500)

    expect(count(grid, MaterialId.plant)).toBeGreaterThan(1)
  })

  it('spends a bounded budget, so a seedling cannot eat an ocean', () => {
    const uses = MATERIALS[MaterialId.plant].uses ?? 0
    const grid = createGrid(30, 30)
    for (let x = 0; x < 30; x++) {
      for (let y = 0; y < 29; y++) put(grid, x, y, MaterialId.water)
    }
    put(grid, 15, 29, MaterialId.plant)

    react(grid, 6000)

    expect(count(grid, MaterialId.plant)).toBeLessThanOrEqual(uses + 1)
  })

  it('ignores water it is not touching', () => {
    const grid = createGrid(7, 7)
    put(grid, 1, 1, MaterialId.plant)
    put(grid, 5, 5, MaterialId.water)

    react(grid, 500)

    expect(count(grid, MaterialId.plant)).toBe(1)
    expect(grid.material[cellIndex(grid, 5, 5)]).toBe(MaterialId.water)
  })
})
