import { Board, Player } from '../tic-tac-toe.types'
import { applyMove, legalMoves, opponentOf } from './board'
import { LOSS_VALUE, WIN_VALUE, orderedMoves, scorePosition } from './evaluate'
import { CELL_COUNT, findWinningLine } from './lines'
import { winningMoves } from './threats'

/**
 * Depth-limited alpha-beta for the strongest difficulty.
 *
 * Not a solve. The tree runs to roughly 10^89 positions and depth eight alone is 1.8 × 10^14, so
 * playing it out is not on the table in a browser. 4×4×4 was solved in 1980, but with about 1500
 * CPU-hours and a hand-built strategy behind it. What this does instead: search as deep as a time
 * budget allows, order moves so the pruning bites, and switch to an exact search once few cells remain,
 * which is when a mistake is least recoverable.
 */

/** Once this few cells are free, the rest of the tree is small enough to settle exactly. */
export const EXACT_SEARCH_CELLS = 10

/** Deepest the time-limited search will look. Past this the evaluation matters more than the depth. */
const MAX_DEPTH = 8

/** Candidates considered per node when nothing is forced. Wider is stronger and slower. */
const BRANCHING_CAP = 12

/** Far enough outside any real score to open a window with. */
const UNBOUNDED = WIN_VALUE * 2

export type SearchLimits = {
  /** Milliseconds the search may spend. */
  budgetMs?: number
  /** Injected so tests can drive the budget without reading a wall clock. */
  now?: () => number
  maxDepth?: number
}

export type SearchResult = {
  move: number
  score: number
  /** How deep the search got before its budget ran out. */
  depth: number
  /** Whether every remaining move was searched to the end rather than cut off. */
  exact: boolean
  nodes: number
}

/** Forced replies on their own; otherwise the best-looking handful, to keep the branching in hand. */
export function candidates(board: Board, player: Player): number[] {
  const ordered = orderedMoves(board, player)
  if (ordered.length <= 1) return ordered

  const forced =
    winningMoves(board, player).length > 0 || winningMoves(board, opponentOf(player)).length > 0
  return forced ? ordered : ordered.slice(0, BRANCHING_CAP)
}

const boardKey = (board: Board, player: Player) =>
  `${player}:${board.map((cell) => cell ?? '.').join(',')}`

/**
 * What a stored score actually says. Alpha-beta returns a bound, not a value: a node that cut off only
 * proves the score is at least that much, and one where nothing beat the incoming alpha only proves it
 * is at most that much. Storing either as the truth lets a later visit under a different window read
 * back a score the search never established.
 */
const Bound = {
  exact: 'exact',
  atLeast: 'atLeast',
  atMost: 'atMost',
} as const
type Bound = (typeof Bound)[keyof typeof Bound]

type Entry = { score: number; bound: Bound }

/** Whether a stored bound settles the question inside the window being asked about. */
function answers(entry: Entry, alpha: number, beta: number): boolean {
  if (entry.bound === Bound.exact) return true
  if (entry.bound === Bound.atLeast) return entry.score >= beta
  return entry.score <= alpha
}

/**
 * Best move for `player`, or null on a full board.
 *
 * Wins and forced blocks are answered without searching: they are certain, and spending budget on them
 * would only cost depth elsewhere.
 */
export function findBestMove(
  board: Board,
  player: Player,
  { budgetMs = 700, now = () => Date.now(), maxDepth = MAX_DEPTH }: SearchLimits = {}
): SearchResult | null {
  const free = legalMoves(board)
  if (free.length === 0) return null

  const wins = winningMoves(board, player)
  if (wins.length > 0) {
    return { move: wins[0], score: WIN_VALUE, depth: 1, exact: true, nodes: 1 }
  }

  const them = opponentOf(player)
  const blocks = winningMoves(board, them)
  if (blocks.length > 0) {
    // More than one way for them to win next move means this is already lost; block one regardless.
    return {
      move: blocks[0],
      score: blocks.length > 1 ? LOSS_VALUE : 0,
      depth: 1,
      exact: true,
      nodes: 1,
    }
  }

  const deadline = now() + budgetMs
  const outOfTime = () => now() >= deadline
  const exhaustive = free.length <= EXACT_SEARCH_CELLS
  const ceiling = exhaustive ? free.length : maxDepth

  const table = new Map<string, Entry>()
  let nodes = 0

  /** Negamax with alpha-beta, scored from the point of view of whoever is to move. */
  const search = (
    state: Board,
    side: Player,
    depth: number,
    alphaIn: number,
    beta: number
  ): number => {
    nodes++

    // Whoever moved last may have just won, which is a loss for the side now to move.
    if (findWinningLine(state, opponentOf(side))) return LOSS_VALUE + depth

    const remaining = legalMoves(state)
    if (remaining.length === 0) return 0
    if (depth === 0) return scorePosition(state, side)

    const key = `${boardKey(state, side)}|${depth}`
    const cached = table.get(key)
    if (cached && answers(cached, alphaIn, beta)) return cached.score

    let alpha = alphaIn
    let cutoff = false
    let truncated = false
    for (const move of candidates(state, side)) {
      if (outOfTime()) {
        truncated = true
        break
      }
      const score = -search(
        applyMove(state, move, side),
        opponentOf(side),
        depth - 1,
        -beta,
        -alpha
      )
      if (score > alpha) alpha = score
      if (alpha >= beta) {
        cutoff = true
        break
      }
    }

    // A node that ran out of time saw only part of its moves, so its alpha is not worth keeping.
    if (!truncated) {
      const bound = cutoff ? Bound.atLeast : alpha > alphaIn ? Bound.exact : Bound.atMost
      table.set(key, { score: alpha, bound })
    }
    return alpha
  }

  let best = { move: free[0], score: -UNBOUNDED, depth: 0 }

  /* Iterative deepening: each pass costs little next to the one after it, and it always leaves a usable
     answer behind when the budget runs out part-way through a pass. */
  for (let depth = 2; depth <= ceiling; depth++) {
    let alpha = -UNBOUNDED
    let bestThisPass = { move: best.move, score: -UNBOUNDED }
    let completed = true

    for (const move of candidates(board, player)) {
      if (outOfTime()) {
        completed = false
        break
      }
      const score = -search(applyMove(board, move, player), them, depth - 1, -UNBOUNDED, -alpha)
      if (score > bestThisPass.score) bestThisPass = { move, score }
      if (score > alpha) alpha = score
    }

    if (completed) {
      best = { ...bestThisPass, depth }
      // A forced win at this depth will not get better by looking further.
      if (best.score >= WIN_VALUE - CELL_COUNT) break
    }
    if (outOfTime()) break
  }

  return {
    move: best.move,
    score: best.score,
    depth: best.depth,
    exact: exhaustive && best.depth >= free.length,
    nodes,
  }
}
