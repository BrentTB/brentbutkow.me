import { describe, it, expect } from 'vitest'
import { MaterialId } from '../pixel-world.types'
import { cellIndex, createGrid, placeMaterial } from './grid'
import { NEIGHBOURS, pickNeighbour } from './neighbours'

describe('NEIGHBOURS', () => {
  it('covers the four sides and nothing else', () => {
    expect(NEIGHBOURS).toHaveLength(4)

    // No diagonals and no staying put: everything that spreads through the grid walks on these.
    for (const [dx, dy] of NEIGHBOURS) {
      expect(Math.abs(dx) + Math.abs(dy)).toBe(1)
    }
  })
})

describe('pickNeighbour', () => {
  it('finds a neighbour the test accepts', () => {
    const grid = createGrid(9, 9)
    placeMaterial(grid, cellIndex(grid, 4, 5), MaterialId.water)

    const found = pickNeighbour(grid, 4, 4, (material) => material === MaterialId.water)

    expect(found).toBe(cellIndex(grid, 4, 5))
  })

  it('reports nothing when no neighbour qualifies', () => {
    const grid = createGrid(9, 9)

    expect(pickNeighbour(grid, 4, 4, (material) => material === MaterialId.water)).toBe(-1)
  })

  it('starts where it is told, so callers can rotate the scan', () => {
    const grid = createGrid(9, 9)
    for (const [dx, dy] of NEIGHBOURS) {
      placeMaterial(grid, cellIndex(grid, 4 + dx, 4 + dy), MaterialId.water)
    }

    const picks = NEIGHBOURS.map((_, start) =>
      pickNeighbour(grid, 4, 4, (material) => material === MaterialId.water, start)
    )

    // A fixed start biases everything that grows or spreads toward one direction.
    expect(new Set(picks).size).toBe(NEIGHBOURS.length)
  })

  it('stays inside the grid at the edges', () => {
    const grid = createGrid(9, 9)
    grid.material.fill(MaterialId.water)

    const corner = pickNeighbour(grid, 0, 0, (material) => material === MaterialId.water)

    expect(corner).toBeGreaterThanOrEqual(0)
    expect(corner).toBeLessThan(grid.material.length)
  })

  it('takes a second opinion on the cell itself, not just its material', () => {
    const grid = createGrid(9, 9)
    placeMaterial(grid, cellIndex(grid, 3, 4), MaterialId.water)
    placeMaterial(grid, cellIndex(grid, 5, 4), MaterialId.water)
    const wanted = cellIndex(grid, 5, 4)

    const found = pickNeighbour(
      grid,
      4,
      4,
      (material) => material === MaterialId.water,
      0,
      (index) => index === wanted
    )

    expect(found).toBe(wanted)
  })
})
