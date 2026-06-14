import { describe, expect, it } from 'vitest'
import { STATE_GRID_COLS, STATE_GRID_ROWS, stateGrid } from './us-state-grid'

describe('stateGrid', () => {
  it('has 51 tiles (50 states + DC) with unique codes', () => {
    expect(stateGrid).toHaveLength(51)
    expect(new Set(stateGrid.map((tile) => tile.code)).size).toBe(51)
  })

  it('keeps every tile within the grid bounds', () => {
    for (const tile of stateGrid) {
      expect(tile.row).toBeGreaterThanOrEqual(1)
      expect(tile.row).toBeLessThanOrEqual(STATE_GRID_ROWS)
      expect(tile.col).toBeGreaterThanOrEqual(1)
      expect(tile.col).toBeLessThanOrEqual(STATE_GRID_COLS)
    }
  })

  it('places no two states in the same cell', () => {
    const cells = stateGrid.map((tile) => `${tile.row}-${tile.col}`)
    expect(new Set(cells).size).toBe(cells.length)
  })
})
