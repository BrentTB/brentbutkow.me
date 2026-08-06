import { Board, Player } from '../othello.types'
import { coordOf, countPieces, idx, legalMoves, opponentOf } from './board'

/**
 * Static board evaluation, scored from a player's point of view: positive is good for `player`.
 *
 * Othello's evaluation surface is well understood, and none of it is disc count until the very end —
 * a lead in discs mid-game usually means a lead in exposed discs the opponent is about to flip back.
 * What actually holds is captured here: corners (which can never be flipped), the squares around an
 * empty corner (which hand one over), and mobility (having moves while the opponent runs out).
 */

/** A finished game scores far outside any positional figure, so a proven result always dominates. */
export const WIN_VALUE = 1_000_000
const LOSS_VALUE = -WIN_VALUE

/**
 * The knobs that shift with the game's phase. Corners matter throughout; mobility rules the opening
 * and disc parity only starts to matter as the board fills, when there is no time left to lose the lead.
 */
export type Weights = {
  corner: number
  /** Penalty (negative) for sitting on an X-square diagonally inside an empty corner. */
  xSquare: number
  /** Penalty (negative) for sitting on a C-square beside an empty corner. */
  cSquare: number
  mobility: number
  disc: number
}

export const OPENING_WEIGHTS: Weights = {
  corner: 120,
  xSquare: -40,
  cSquare: -20,
  mobility: 12,
  disc: 0,
}

export const ENDGAME_WEIGHTS: Weights = {
  corner: 120,
  xSquare: -16,
  cSquare: -8,
  mobility: 3,
  disc: 8,
}

/** Below this fraction of empty squares the game is closing out, and disc count starts to rule. */
const ENDGAME_EMPTY_FRACTION = 0.22

/** The tuned weights for the phase this board is in. */
export function weightsFor(board: Board): Weights {
  const empties = board.cells.reduce((count, cell) => count + (cell === null ? 1 : 0), 0)
  return empties / board.cells.length <= ENDGAME_EMPTY_FRACTION ? ENDGAME_WEIGHTS : OPENING_WEIGHTS
}

/** A modest positional table: edges are worth holding, the ring just inside the edge is not. */
const EDGE_VALUE = 8
const NEAR_EDGE_VALUE = -3

const positionalCache = new Map<number, readonly number[]>()

/**
 * Per-cell positional value for a board of this size, cached. Corners and the squares around them are
 * left at zero here — they are scored dynamically, since an X-square is only a liability while its
 * corner is empty.
 */
function positionalTable(size: number): readonly number[] {
  const cached = positionalCache.get(size)
  if (cached) return cached

  const last = size - 1
  const isCorner = (r: number, c: number) => (r === 0 || r === last) && (c === 0 || c === last)
  const isNearCorner = (r: number, c: number) =>
    (r <= 1 || r >= last - 1) && (c <= 1 || c >= last - 1)
  const onEdge = (r: number, c: number) => r === 0 || r === last || c === 0 || c === last
  const nearEdge = (r: number, c: number) => r === 1 || r === last - 1 || c === 1 || c === last - 1

  const table = new Array<number>(size * size).fill(0)
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (isCorner(r, c) || isNearCorner(r, c)) continue // scored dynamically
      if (onEdge(r, c)) table[idx(r, c, size)] = EDGE_VALUE
      else if (nearEdge(r, c)) table[idx(r, c, size)] = NEAR_EDGE_VALUE
    }
  }
  positionalCache.set(size, table)
  return table
}

/** The four corner indices for a board of this size. */
export function corners(size: number): number[] {
  const last = size - 1
  return [idx(0, 0, size), idx(0, last, size), idx(last, 0, size), idx(last, last, size)]
}

/** The X-square (diagonal-inner neighbour) and C-squares (edge neighbours) of a corner. */
function dangerSquares(corner: number, size: number): { x: number; c: number[] } {
  const { row, col } = coordOf(corner, size)
  const dr = row === 0 ? 1 : -1
  const dc = col === 0 ? 1 : -1
  return {
    x: idx(row + dr, col + dc, size),
    c: [idx(row + dr, col, size), idx(row, col + dc, size)],
  }
}

/**
 * The score of `board` for `player`. A finished game is scored by disc count alone, in win units.
 */
export function scorePosition(board: Board, player: Player, weights = weightsFor(board)): number {
  const them = opponentOf(player)
  const { cells, size } = board
  const table = positionalTable(size)

  const myMoves = legalMoves(board, player).length
  const theirMoves = legalMoves(board, them).length

  // No move for either side: the game is over, and only the final tally counts.
  if (myMoves === 0 && theirMoves === 0) {
    const counts = countPieces(board)
    const diff = counts[player] - counts[them]
    if (diff > 0) return WIN_VALUE + diff
    if (diff < 0) return LOSS_VALUE + diff
    return 0
  }

  let positional = 0
  let discs = 0
  for (let index = 0; index < cells.length; index++) {
    const owner = cells[index]
    if (owner === null) continue
    const sign = owner === player ? 1 : -1
    discs += sign
    positional += sign * table[index]
  }

  let cornerScore = 0
  for (const corner of corners(size)) {
    const owner = cells[corner]
    if (owner === player) cornerScore += weights.corner
    else if (owner === them) cornerScore -= weights.corner
    else {
      // The corner is still there for the taking: penalise whoever is feeding it to the other side.
      const { x, c } = dangerSquares(corner, size)
      const xOwner = cells[x]
      if (xOwner === player) cornerScore += weights.xSquare
      else if (xOwner === them) cornerScore -= weights.xSquare
      for (const cSquare of c) {
        const cOwner = cells[cSquare]
        if (cOwner === player) cornerScore += weights.cSquare
        else if (cOwner === them) cornerScore -= weights.cSquare
      }
    }
  }

  const mobility = (myMoves - theirMoves) * weights.mobility
  const disc = discs * weights.disc
  return positional + cornerScore + mobility + disc
}

/**
 * Legal moves ordered best-first, so alpha-beta prunes hard: corners first, the squares that give a
 * corner away last, the rest by how many discs they flip. Ordering only, never a filter.
 */
export function orderedMoves(board: Board, player: Player): number[] {
  const size = board.size
  const cornerSet = new Set(corners(size))
  const dangerSet = new Set<number>()
  for (const corner of corners(size)) {
    if (board.cells[corner] !== null) continue
    const { x, c } = dangerSquares(corner, size)
    dangerSet.add(x)
    for (const cSquare of c) dangerSet.add(cSquare)
  }

  const rank = (move: number): number => {
    if (cornerSet.has(move)) return 3
    if (dangerSet.has(move)) return 0
    return 2
  }

  return legalMoves(board, player).sort((a, b) => rank(b) - rank(a))
}
