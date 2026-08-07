import { Board, Cell, Coord, MoveResult, Player } from '../othello.types'

/**
 * Pure, size-agnostic Othello rules. The game UI and the opponent both go through these, so a move
 * chooser can be written and tested without touching React. A board is a flat array read row-major
 * plus its edge length, so every helper takes the size from the board it is handed.
 */

/** The eight directions a capture line can run. */
const DIRECTIONS: readonly Coord[] = [
  { row: -1, col: -1 },
  { row: -1, col: 0 },
  { row: -1, col: 1 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
  { row: 1, col: -1 },
  { row: 1, col: 0 },
  { row: 1, col: 1 },
]

export function idx(row: number, col: number, size: number): number {
  return row * size + col
}

export function coordOf(index: number, size: number): Coord {
  return { row: Math.floor(index / size), col: index % size }
}

function inBounds(row: number, col: number, size: number): boolean {
  return row >= 0 && row < size && col >= 0 && col < size
}

export function opponentOf(player: Player): Player {
  return player === Player.dark ? Player.light : Player.dark
}

/**
 * A fresh board with the four opening discs in the centre: light on the main diagonal, dark on the
 * anti-diagonal, the standard Othello setup. `size` is assumed even, which every offered board is.
 */
export function createBoard(size: number): Board {
  const cells = new Array<Cell>(size * size).fill(null)
  const mid = size / 2
  cells[idx(mid - 1, mid - 1, size)] = Player.light
  cells[idx(mid - 1, mid, size)] = Player.dark
  cells[idx(mid, mid - 1, size)] = Player.dark
  cells[idx(mid, mid, size)] = Player.light
  return { cells, size }
}

/**
 * The discs a move at `index` would flip for `player`, in outward order per direction. Empty when the
 * move is illegal — the cell is off the board, taken, or flanks nothing.
 */
export function getCapturesAt(board: Board, index: number, player: Player): number[] {
  const { cells, size } = board
  if (index < 0 || index >= cells.length || cells[index] !== null) return []

  const { row, col } = coordOf(index, size)
  const them = opponentOf(player)
  const flipped: number[] = []

  for (const dir of DIRECTIONS) {
    const line: number[] = []
    let r = row + dir.row
    let c = col + dir.col
    while (inBounds(r, c, size) && cells[idx(r, c, size)] === them) {
      line.push(idx(r, c, size))
      r += dir.row
      c += dir.col
    }
    // A run of the opponent's discs only counts once it is closed by one of ours.
    if (line.length > 0 && inBounds(r, c, size) && cells[idx(r, c, size)] === player) {
      flipped.push(...line)
    }
  }

  return flipped
}

/** Every square where `player` has a legal move. */
export function legalMoves(board: Board, player: Player): number[] {
  const moves: number[] = []
  for (let index = 0; index < board.cells.length; index++) {
    if (board.cells[index] === null && getCapturesAt(board, index, player).length > 0) {
      moves.push(index)
    }
  }
  return moves
}

export function hasLegalMove(board: Board, player: Player): boolean {
  for (let index = 0; index < board.cells.length; index++) {
    if (board.cells[index] === null && getCapturesAt(board, index, player).length > 0) {
      return true
    }
  }
  return false
}

/**
 * The board after `player` plays at `index`, plus the discs that flipped. Returns the board unchanged
 * with no flips when the move is illegal, so a caller that trusts `legalMoves` never has to branch.
 */
export function applyMove(board: Board, index: number, player: Player): MoveResult {
  const flipped = getCapturesAt(board, index, player)
  if (flipped.length === 0) return { board, flipped: [] }

  const cells = [...board.cells]
  cells[index] = player
  for (const cell of flipped) cells[cell] = player
  return { board: { cells, size: board.size }, flipped }
}

/** Neither side can move: the game is over. */
export function isGameOver(board: Board): boolean {
  return !hasLegalMove(board, Player.dark) && !hasLegalMove(board, Player.light)
}

export function countPieces(board: Board): Record<Player, number> {
  const counts: Record<Player, number> = { dark: 0, light: 0 }
  for (const cell of board.cells) {
    if (cell !== null) counts[cell]++
  }
  return counts
}
