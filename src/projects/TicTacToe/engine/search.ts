import { Board, Player } from '../tic-tac-toe.types'
import { applyMove, legalMoves, opponentOf } from './board'
import { LOSS_VALUE, WIN_VALUE, orderedMoves, scorePosition } from './evaluate'
import { CELL_COUNT, findWinningLine } from './lines'
import { findForcedWin, hasForcedWin } from './forced-win'
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

/**
 * Once this few cells are free, the search plays out the rest of the tree instead of stopping at a depth.
 *
 * Set where the branch actually earns its keep. Lower down, an immediate win or a forced block is nearly
 * always on the board and gets answered before any searching happens, so the exhaustive pass would never
 * run. If it turns out not to fit the budget, the deepening passes underneath it still stand.
 */
export const EXACT_SEARCH_CELLS = 14

/** Deepest the time-limited search will look. Past this the evaluation matters more than the depth. */
const MAX_DEPTH = 8

/** Candidates considered per node when nothing is forced. Wider is stronger and slower. */
const BRANCHING_CAP = 12

/** Longest forced chain the threat-space search chases, counted in the mover's own moves. */
export const FORCED_CHAIN_DEPTH = 14

/**
 * How much of the budget the threat-space passes may take before the ordinary search runs. Both passes
 * exit early on a quiet board, so this is a ceiling for thickets of threats, not a routine spend.
 */
const FORCED_WIN_SLICE_MS = 260
const FORCED_LOSS_SLICE_MS = 260

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
  /**
   * Whether the answer is settled rather than a best guess: either the rest of the tree was played out,
   * or the score is a win or loss the search proved on the way.
   */
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

/**
 * The root candidates, minus any move that hands the opponent a forced win. This is the mirror of the
 * offensive threat-space pass: losing to a chain is a matter of walking into one, so a move the opponent
 * can answer with a proved win is struck off before the ordinary search ever weighs it.
 *
 * If every move loses to a chain, the position is lost whatever is played, so the full list is kept and
 * the search picks the longest resistance. Running out of budget leaves the list untouched for the same
 * reason: a filter that half-ran would drop good moves on no evidence.
 */
function safeCandidates(
  board: Board,
  player: Player,
  deadline: number,
  now: () => number
): number[] {
  const ranked = candidates(board, player)
  if (ranked.length <= 1) return ranked

  const them = opponentOf(player)
  const cutoff = Math.min(deadline, now() + FORCED_LOSS_SLICE_MS)
  const safe: number[] = []
  for (const move of ranked) {
    if (now() >= cutoff) return ranked // unfinished filter proves nothing; trust the ordering instead
    const forcedLoss = hasForcedWin(applyMove(board, move, player), them, {
      now,
      deadline: cutoff,
      maxDepth: FORCED_CHAIN_DEPTH,
    })
    if (!forcedLoss) safe.push(move)
  }
  return safe.length > 0 ? safe : ranked
}

/**
 * One string per position. A character per cell rather than the player names joined: the search builds
 * one of these at every node, and a 65-character key costs a third of what the spelled-out version does.
 */
function boardKey(board: Board, player: Player): string {
  let key = player === Player.one ? 'x' : 'o'
  for (const cell of board) key += cell === null ? '.' : cell === Player.one ? 'x' : 'o'
  return key
}

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

  // One cell left is a forced move: there is nothing to compare it against, so searching says nothing.
  if (free.length === 1) {
    return { move: free[0], score: 0, depth: 0, exact: true, nodes: 1 }
  }

  const deadline = now() + budgetMs
  const outOfTime = () => now() >= deadline
  const exhaustive = free.length <= EXACT_SEARCH_CELLS

  /* Threat-space search only earns its keep while the ordinary search is depth-limited. Once few enough
     cells remain the rest of the tree is played out exactly, so every forced win and loss is already
     seen. Above that, a proved chain beats any heuristic: look for the attacker's win, then strike off
     any move that would hand the same to the opponent. Both exit at once on a board with no threats to
     build from, which is most of them, so the common case pays almost nothing. */
  if (!exhaustive) {
    const forcedWin = findForcedWin(board, player, {
      now,
      deadline: Math.min(deadline, now() + FORCED_WIN_SLICE_MS),
      maxDepth: FORCED_CHAIN_DEPTH,
    })
    if (forcedWin !== null) {
      return { move: forcedWin, score: WIN_VALUE, depth: FORCED_CHAIN_DEPTH, exact: true, nodes: 1 }
    }
  }

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

    /* Whoever moved last may have just won, which is a loss for the side now to move. `depth` counts
       plies still to look at, so subtracting it prefers the loss that takes longest to arrive — and,
       through the negation on the way back up, the win that arrives soonest. */
    if (findWinningLine(state, opponentOf(side))) return LOSS_VALUE - depth

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

  const ranked = exhaustive
    ? candidates(board, player)
    : safeCandidates(board, player, deadline, now)
  // Something playable before the first pass finishes, and the ordering already knows which cell that is.
  let best = { move: ranked[0] ?? free[0], score: -UNBOUNDED, depth: 0 }

  /* Iterative deepening: each pass costs little next to the one after it, and it always leaves a usable
     answer behind when the budget runs out part-way through a pass. */
  for (let depth = 2; depth <= ceiling; depth++) {
    let alpha = -UNBOUNDED
    let bestThisPass = { move: best.move, score: -UNBOUNDED }
    let completed = true

    for (const move of ranked) {
      if (outOfTime()) {
        completed = false
        break
      }
      const score = -search(applyMove(board, move, player), them, depth - 1, -UNBOUNDED, -alpha)
      if (score > bestThisPass.score) bestThisPass = { move, score }
      if (score > alpha) alpha = score
    }

    /* A deadline that lands inside the last candidate leaves the loop normally, so the pass looks
       finished. Its scores are short of the moves that were never visited, which reads as better than
       they are, and taking that as the answer plays a move on evidence the search does not have. */
    if (outOfTime()) completed = false

    if (completed) {
      best = { ...bestThisPass, depth }
      // A forced win at this depth will not get better by looking further.
      if (best.score >= WIN_VALUE - CELL_COUNT) break
    }
    if (outOfTime()) break
  }

  // A mate found at depth three needs no fourth pass: the result is proved, not merely the best so far.
  const decided = Math.abs(best.score) >= WIN_VALUE - CELL_COUNT

  return {
    move: best.move,
    score: best.score,
    depth: best.depth,
    exact: decided || (exhaustive && best.depth >= free.length),
    nodes,
  }
}
