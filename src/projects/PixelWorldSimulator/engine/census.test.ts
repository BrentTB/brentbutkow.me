import { describe, it, expect } from 'vitest'
import { MaterialId } from '../pixel-world.types'
import { cellIndex, createGrid, placeMaterial } from './grid'
import { MATERIALS } from './materials'
import { countMaterials } from './census'

describe('countMaterials', () => {
  it('counts a fresh world as nothing but air', () => {
    const grid = createGrid(8, 5)

    const counts = countMaterials(grid)

    expect(counts[MaterialId.empty]).toBe(40)
    expect(counts[MaterialId.stone]).toBe(0)
  })

  it('counts what has been placed, and takes it off the air', () => {
    const grid = createGrid(8, 5)
    placeMaterial(grid, cellIndex(grid, 1, 1), MaterialId.stone)
    placeMaterial(grid, cellIndex(grid, 2, 1), MaterialId.stone)
    placeMaterial(grid, cellIndex(grid, 3, 1), MaterialId.ant)

    const counts = countMaterials(grid)

    expect(counts[MaterialId.stone]).toBe(2)
    expect(counts[MaterialId.ant]).toBe(1)
    expect(counts[MaterialId.empty]).toBe(37)
  })

  it('always totals every cell in the world', () => {
    const grid = createGrid(9, 7)
    placeMaterial(grid, cellIndex(grid, 0, 0), MaterialId.water)
    placeMaterial(grid, cellIndex(grid, 8, 6), MaterialId.lava)

    const counts = countMaterials(grid)

    let total = 0
    for (const count of counts) total += count
    expect(total).toBe(63)
  })

  it('has a slot for every material', () => {
    expect(countMaterials(createGrid(4, 4))).toHaveLength(MATERIALS.length)
  })

  it('reuses the array it is handed rather than allocating a new one', () => {
    // The panel that reads this refreshes several times a second, so the tally is written into one array
    // that lives for the life of the world instead of a fresh one per refresh.
    const grid = createGrid(6, 6)
    const scratch = new Uint32Array(MATERIALS.length)

    const counts = countMaterials(grid, scratch)

    expect(counts).toBe(scratch)
  })

  it('clears the previous tally instead of adding to it', () => {
    const grid = createGrid(6, 6)
    placeMaterial(grid, cellIndex(grid, 1, 1), MaterialId.sand)
    const scratch = new Uint32Array(MATERIALS.length)

    countMaterials(grid, scratch)
    countMaterials(grid, scratch)

    // Counted twice into the same array, sand is still 1 — a stale tally would read 2 and the panel would
    // climb forever while nothing in the world changed.
    expect(scratch[MaterialId.sand]).toBe(1)
  })
})
