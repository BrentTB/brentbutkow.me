import { Board, Coord, Player } from '../tic-tac-toe.types'

/** Cells along one edge of the cube. Four in a row wins, so the run length matches the edge. */
export const BOARD_SIZE = 4

/** Layers, rows, and columns: 64 lattice sites. */
export const CELL_COUNT = BOARD_SIZE ** 3

/** Flat index for a lattice site. Layer is the slowest axis, so a layer's cells are contiguous. */
export function cellIndex(x: number, y: number, layer: number): number {
  return layer * BOARD_SIZE * BOARD_SIZE + y * BOARD_SIZE + x
}

/** The inverse of `cellIndex`. */
export function cellCoord(index: number): Coord {
  return {
    x: index % BOARD_SIZE,
    y: Math.floor(index / BOARD_SIZE) % BOARD_SIZE,
    layer: Math.floor(index / (BOARD_SIZE * BOARD_SIZE)),
  }
}

const inBounds = (value: number) => value >= 0 && value < BOARD_SIZE

/**
 * The 13 directions a line can run. Every direction has an opposite that traces the same set of
 * cells, so only one of each pair is kept: the one whose first non-zero step is positive.
 */
function uniqueDirections(): number[][] {
  const directions: number[][] = []
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dLayer = -1; dLayer <= 1; dLayer++) {
        if (dx === 0 && dy === 0 && dLayer === 0) continue
        const lead = [dx, dy, dLayer].find((step) => step !== 0)
        if (lead === undefined || lead < 0) continue
        directions.push([dx, dy, dLayer])
      }
    }
  }
  return directions
}

/**
 * Every run of four in a straight line: rows, columns, rods, the diagonals inside each plane, and
 * the four corner-to-corner body diagonals. A line is counted once, from the end where stepping
 * backwards would leave the cube.
 */
export const WINNING_LINES: readonly (readonly number[])[] = (() => {
  const directions = uniqueDirections()
  const lines: number[][] = []

  for (let layer = 0; layer < BOARD_SIZE; layer++) {
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        for (const [dx, dy, dLayer] of directions) {
          const startsEarlier = inBounds(x - dx) && inBounds(y - dy) && inBounds(layer - dLayer)
          if (startsEarlier) continue

          const last = BOARD_SIZE - 1
          const endsInside =
            inBounds(x + last * dx) && inBounds(y + last * dy) && inBounds(layer + last * dLayer)
          if (!endsInside) continue

          lines.push(
            Array.from({ length: BOARD_SIZE }, (_, step) =>
              cellIndex(x + step * dx, y + step * dy, layer + step * dLayer)
            )
          )
        }
      }
    }
  }

  return lines
})()

/** The first completed line for this player, or null if they have not got four yet. */
export function findWinningLine(board: Board, player: Player): readonly number[] | null {
  return WINNING_LINES.find((line) => line.every((cell) => board[cell] === player)) ?? null
}

/** The five ways a line can run on this board. */
export const LineShape = {
  /** A row or a column, inside one layer. */
  flatRow: 'flatRow',
  /** A plate's own diagonal, inside one layer. */
  flatDiagonal: 'flatDiagonal',
  /** Straight up one rod. */
  rod: 'rod',
  /** Climbing the layers while moving along a single axis. */
  climbing: 'climbing',
  /** Climbing the layers while moving along both: corner to corner through the cube. */
  bodyDiagonal: 'bodyDiagonal',
} as const
export type LineShape = (typeof LineShape)[keyof typeof LineShape]

/** How a line runs. `layer` is set only for the shapes that stay inside one, counted from 1. */
export type LineDescription = {
  shape: LineShape
  layer: number | null
}

/**
 * The shape of a line. On a 4×4×4 board this is the part that is hard to read off the screen, so the UI
 * says it out loud; the words themselves live with the rest of the copy.
 */
export function lineShape(line: readonly number[]): LineDescription {
  const start = cellCoord(line[0])
  const next = cellCoord(line[1])
  const stepX = next.x - start.x
  const stepY = next.y - start.y
  const stepLayer = next.layer - start.layer
  const diagonalInPlate = stepX !== 0 && stepY !== 0

  if (stepLayer === 0) {
    return {
      shape: diagonalInPlate ? LineShape.flatDiagonal : LineShape.flatRow,
      layer: start.layer + 1,
    }
  }
  if (stepX === 0 && stepY === 0) return { shape: LineShape.rod, layer: null }
  return {
    shape: diagonalInPlate ? LineShape.bodyDiagonal : LineShape.climbing,
    layer: null,
  }
}
