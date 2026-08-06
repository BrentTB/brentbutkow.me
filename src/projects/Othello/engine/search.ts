import { Board, Player } from '../othello.types'
import { applyMove, hasLegalMove, opponentOf } from './board'
import { WIN_VALUE, orderedMoves, scorePosition } from './evaluate'

/**
 * Depth-limited negamax with alpha-beta for the hard difficulty.
 *
 * Othello's branching factor is low (around ten), so a plain alpha-beta over corner-first move
 * ordering reaches a useful depth inside a move's worth of thinking time. Once few squares remain the
 * search drops its depth cap and plays the game out exactly — the end is where a mistake cannot be
 * taken back, and it is cheap enough to solve there.
 */

/** Deepest the time-limited search looks while the board is still full. */
const MAX_DEPTH = 7

/** At or below this many empty squares, the search abandons its depth cap and solves to the end. */
const EXACT_SEARCH_CELLS = 12

/** Far enough outside any real score to open a window with. */
const UNBOUNDED = WIN_VALUE * 4

export type SearchLimits = {
  /** Milliseconds the search may spend. */
  budgetMs?: number
  /** Injected so tests can drive the budget without a wall clock. */
  now?: () => number
  maxDepth?: number
}

export type SearchResult = {
  move: number
  score: number
  /** How deep the completed search reached. */
  depth: number
}

function emptyCount(board: Board): number {
  return board.cells.reduce((count, cell) => count + (cell === null ? 1 : 0), 0)
}

/**
 * Best move for `player`, or null when they have no legal move (the caller passes). Wins are not
 * short-circuited — corner-first ordering finds them early, and the exact endgame proves them anyway.
 */
export function findBestMove(
  board: Board,
  player: Player,
  { budgetMs = 700, now = () => Date.now(), maxDepth = MAX_DEPTH }: SearchLimits = {}
): SearchResult | null {
  const rootMoves = orderedMoves(board, player)
  if (rootMoves.length === 0) return null
  if (rootMoves.length === 1) return { move: rootMoves[0], score: 0, depth: 1 }

  const deadline = now() + budgetMs
  const outOfTime = () => now() >= deadline
  const exhaustive = emptyCount(board) <= EXACT_SEARCH_CELLS
  const ceiling = exhaustive ? board.cells.length : maxDepth

  /** Negamax, scored from the side to move. A side with no move passes; neither moving ends it. */
  const search = (
    state: Board,
    side: Player,
    depth: number,
    alphaIn: number,
    beta: number
  ): number => {
    const moves = orderedMoves(state, side)
    if (moves.length === 0) {
      if (!hasLegalMove(state, opponentOf(side))) return scorePosition(state, side)
      // A pass: the turn goes to the opponent without a disc, and still costs a ply of the budget.
      return -search(state, opponentOf(side), depth - 1, -beta, -alphaIn)
    }
    if (depth === 0) return scorePosition(state, side)

    let alpha = alphaIn
    let best = -UNBOUNDED
    for (const move of moves) {
      if (outOfTime()) break
      const { board: next } = applyMove(state, move, side)
      const score = -search(next, opponentOf(side), depth - 1, -beta, -alpha)
      if (score > best) best = score
      if (best > alpha) alpha = best
      if (alpha >= beta) break
    }
    return best
  }

  let best = { move: rootMoves[0], score: -UNBOUNDED, depth: 0 }

  // Iterative deepening: every pass leaves a usable answer behind if the budget runs out mid-search.
  for (let depth = 2; depth <= ceiling; depth++) {
    let alpha = -UNBOUNDED
    let bestThisPass = { move: best.move, score: -UNBOUNDED }
    let completed = true

    for (const move of rootMoves) {
      if (outOfTime()) {
        completed = false
        break
      }
      const { board: next } = applyMove(board, move, player)
      const score = -search(next, opponentOf(player), depth - 1, -UNBOUNDED, -alpha)
      if (score > bestThisPass.score) bestThisPass = { move, score }
      if (score > alpha) alpha = score
    }

    if (outOfTime()) completed = false
    if (completed) best = { ...bestThisPass, depth }
    if (outOfTime()) break
  }

  return best
}
