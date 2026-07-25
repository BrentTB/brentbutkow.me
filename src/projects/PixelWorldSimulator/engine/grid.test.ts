import { describe, it, expect } from 'vitest'
import { MaterialId } from '../pixel-world.types'
import { cellIndex, clearGrid, createGrid, inBounds } from './grid'

describe('grid', () => {
  it('allocates one cell per position', () => {
    const grid = createGrid(7, 4)
    expect(grid.material).toHaveLength(28)
    expect(grid.moved).toHaveLength(28)
    expect(grid.material.every((cell) => cell === MaterialId.empty)).toBe(true)
  })

  it('indexes row-major', () => {
    const grid = createGrid(10, 5)
    expect(cellIndex(grid, 0, 0)).toBe(0)
    expect(cellIndex(grid, 3, 0)).toBe(3)
    expect(cellIndex(grid, 3, 2)).toBe(23)
  })

  it('bounds-checks every edge', () => {
    const grid = createGrid(4, 3)
    expect(inBounds(grid, 0, 0)).toBe(true)
    expect(inBounds(grid, 3, 2)).toBe(true)
    expect(inBounds(grid, -1, 0)).toBe(false)
    expect(inBounds(grid, 0, -1)).toBe(false)
    expect(inBounds(grid, 4, 0)).toBe(false)
    expect(inBounds(grid, 0, 3)).toBe(false)
  })

  it('clears materials and move flags together', () => {
    const grid = createGrid(4, 4)
    grid.material.fill(MaterialId.sand)
    grid.moved.fill(1)

    clearGrid(grid)

    expect(grid.material.every((cell) => cell === MaterialId.empty)).toBe(true)
    expect(grid.moved.every((flag) => flag === 0)).toBe(true)
  })
})
