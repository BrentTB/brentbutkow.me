import { describe, expect, it } from 'vitest'
import {
  BOARD_SIZE,
  CELL_COUNT,
  WINNING_LINES,
  cellCoord,
  cellIndex,
  describeLine,
  findWinningLine,
} from './lines'
import { applyMove, createBoard } from './board'
import { Player } from '../tic-tac-toe.types'

describe('cellIndex / cellCoord', () => {
  it('round-trips every site on the board', () => {
    for (let index = 0; index < CELL_COUNT; index++) {
      const coord = cellCoord(index)
      expect(cellIndex(coord.x, coord.y, coord.layer)).toBe(index)
    }
  })

  it('keeps each layer contiguous, so a layer can be sliced out by index', () => {
    for (let layer = 0; layer < BOARD_SIZE; layer++) {
      const indices = []
      for (let y = 0; y < BOARD_SIZE; y++) {
        for (let x = 0; x < BOARD_SIZE; x++) indices.push(cellIndex(x, y, layer))
      }
      const lowest = Math.min(...indices)
      const highest = Math.max(...indices)
      expect(highest - lowest).toBe(BOARD_SIZE * BOARD_SIZE - 1)
    }
  })
})

describe('WINNING_LINES', () => {
  // 4x4x4 has 76 lines: 48 axis-aligned, 24 plane diagonals, 4 body diagonals.
  it('finds all 76 lines exactly once', () => {
    expect(WINNING_LINES).toHaveLength(76)
    const seen = new Set(WINNING_LINES.map((line) => [...line].sort((a, b) => a - b).join(',')))
    expect(seen.size).toBe(WINNING_LINES.length)
  })

  it('gives every line four distinct in-bounds cells', () => {
    for (const line of WINNING_LINES) {
      expect(line).toHaveLength(BOARD_SIZE)
      expect(new Set(line).size).toBe(BOARD_SIZE)
      for (const cell of line) {
        expect(cell).toBeGreaterThanOrEqual(0)
        expect(cell).toBeLessThan(CELL_COUNT)
      }
    }
  })

  it('keeps a constant step along each line, so no line wraps across an edge', () => {
    for (const line of WINNING_LINES) {
      const coords = line.map(cellCoord)
      const step = {
        x: coords[1].x - coords[0].x,
        y: coords[1].y - coords[0].y,
        layer: coords[1].layer - coords[0].layer,
      }
      for (let i = 1; i < coords.length; i++) {
        expect(coords[i].x - coords[i - 1].x).toBe(step.x)
        expect(coords[i].y - coords[i - 1].y).toBe(step.y)
        expect(coords[i].layer - coords[i - 1].layer).toBe(step.layer)
      }
    }
  })

  it('includes the four body diagonals', () => {
    const bodyDiagonals = WINNING_LINES.filter((line) => {
      const from = cellCoord(line[0])
      const to = cellCoord(line[BOARD_SIZE - 1])
      return (
        Math.abs(to.x - from.x) === BOARD_SIZE - 1 &&
        Math.abs(to.y - from.y) === BOARD_SIZE - 1 &&
        Math.abs(to.layer - from.layer) === BOARD_SIZE - 1
      )
    })
    expect(bodyDiagonals).toHaveLength(4)
  })
})

describe('findWinningLine', () => {
  it('finds nothing on an empty board', () => {
    expect(findWinningLine(createBoard(), Player.one)).toBeNull()
  })

  it('finds a line up a single rod', () => {
    let board = createBoard()
    for (let layer = 0; layer < BOARD_SIZE; layer++) {
      board = applyMove(board, cellIndex(2, 1, layer), Player.one)
    }
    expect(findWinningLine(board, Player.one)).not.toBeNull()
  })

  it('finds the corner-to-corner diagonal', () => {
    let board = createBoard()
    for (let step = 0; step < BOARD_SIZE; step++) {
      board = applyMove(board, cellIndex(step, step, step), Player.one)
    }
    expect(findWinningLine(board, Player.one)).not.toBeNull()
  })

  it('ignores a line of four split between the two players', () => {
    let board = createBoard()
    board = applyMove(board, cellIndex(0, 0, 0), Player.one)
    board = applyMove(board, cellIndex(1, 0, 0), Player.one)
    board = applyMove(board, cellIndex(2, 0, 0), Player.one)
    board = applyMove(board, cellIndex(3, 0, 0), Player.two)
    expect(findWinningLine(board, Player.one)).toBeNull()
    expect(findWinningLine(board, Player.two)).toBeNull()
  })

  it('does not credit a line to the player who does not own it', () => {
    let board = createBoard()
    for (let x = 0; x < BOARD_SIZE; x++) board = applyMove(board, cellIndex(x, 0, 0), Player.two)
    expect(findWinningLine(board, Player.two)).not.toBeNull()
    expect(findWinningLine(board, Player.one)).toBeNull()
  })
})

describe('describeLine', () => {
  const lineThrough = (from: [number, number, number], step: [number, number, number]) =>
    Array.from({ length: BOARD_SIZE }, (_, i) =>
      cellIndex(from[0] + i * step[0], from[1] + i * step[1], from[2] + i * step[2])
    )

  it('names a flat line by its layer, counting from one', () => {
    expect(describeLine(lineThrough([0, 2, 2], [1, 0, 0]))).toBe('straight line in layer 3')
  })

  it('names a diagonal inside a single layer', () => {
    expect(describeLine(lineThrough([0, 0, 0], [1, 1, 0]))).toBe('diagonal in layer 1')
  })

  it('names a line up one rod', () => {
    expect(describeLine(lineThrough([1, 1, 0], [0, 0, 1]))).toBe('straight up one rod')
  })

  it('names the body diagonal', () => {
    expect(describeLine(lineThrough([0, 0, 0], [1, 1, 1]))).toBe('corner to corner')
  })

  it('names a diagonal that climbs layers along one axis only', () => {
    expect(describeLine(lineThrough([0, 1, 0], [1, 0, 1]))).toBe('diagonal through all four layers')
  })
})
