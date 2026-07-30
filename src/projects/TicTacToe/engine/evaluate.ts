import { Board, Player } from '../tic-tac-toe.types'
import { applyMove, legalMoves, opponentOf } from './board'
import {
  LINES_THROUGH_CELL,
  Sight,
  VISIBLE_LINES,
  forkCells,
  readLines,
  threatsAfter,
  winningMoves,
} from './threats'
import { WINNING_LINES } from './lines'

/**
 * Scoring a position by its lines.
 *
 * A cell is worth what the lines through it are worth. A line with none of the opponent's pieces is
 * live, and worth more the more of mine are already on it; a line the opponent has touched is worth
 * nothing to me, however many ways it nominally offered to win. So a corner nominally sits on seven
 * lines, but with the opponent on five of them it is really worth two.
 */

/**
 * The numbers the positional play is built from. Kept in one object so they can be swapped wholesale:
 * they were tuned by self-play, and a future retune should be able to run without editing this file.
 */
export type Weights = {
  /**
   * What a line holding this many of my pieces and none of the opponent's is worth, indexed 0 to 4.
   *
   * The jump at three is the point: a line one move from finishing forces a reply, which is worth far
   * more than the tidy two-in-a-row that led to it.
   */
  own: readonly number[]
  /**
   * What denying a line is worth, by how many of the opponent's pieces sit on it, indexed 0 to 4.
   *
   * Graded rather than flat. Spoiling a line they hold three of is close to compulsory. Spoiling one
   * they hold two of is real value, and it stacks with whatever else the same cell does. Sitting on a
   * line they have merely started counts for very little, but not for nothing.
   */
  deny: readonly number[]
  /** A move that leaves two lines one short wins next turn unless the reply wins outright. */
  fork: number
  /** Leaving a cell that would become a fork is the position the strong difficulties play towards. */
  forkSetup: number
}

/**
 * Tuned by self-play: coordinate descent over each knob, candidate against incumbent, both seats, many
 * seeds. Two findings worth keeping:
 *
 * Spoiling a line the opponent holds two of is worth nearly as much as building a second of my own.
 * Dropping it to 8 lost heavily; raising it well past the old 22 kept winning.
 *
 * The fork-setup bonus was badly overweighted at 260. It was swamping the line values and pulling the
 * play towards speculative shapes over solid ones.
 *
 * `deny[3]` and `fork` showed no sensitivity at any value, because a three on either side is already
 * settled by the forced win and block checks before any scoring happens.
 */
export const DEFAULT_WEIGHTS: Weights = {
  own: [0, 1, 12, 90, 900],
  deny: [0, 2, 80, 700, 0],
  fork: 4000,
  forkSetup: 80,
}

/** Kept for callers that only need to know a fork outranks any ordinary placement. */
export const FORK_VALUE = DEFAULT_WEIGHTS.fork

/** Beyond any positional score: taking it ends the game. */
export const WIN_VALUE = 1_000_000

/** Below any positional score: leaving it loses the game. */
export const LOSS_VALUE = -WIN_VALUE

/**
 * How many lines through `cell` `player` could still win on: the count that actually matters, as
 * opposed to the geometry. A corner sits on seven lines, but with the opponent on four of them only
 * three remain winnable, and it is worth about as much as an ordinary cell.
 */
export function liveLinesThrough(
  board: Board,
  cell: number,
  player: Player,
  sight: Sight = Sight.everything
): number {
  const them = opponentOf(player)
  const visible = VISIBLE_LINES[sight]
  let live = 0

  for (const lineIndex of LINES_THROUGH_CELL[cell]) {
    if (!visible.includes(lineIndex)) continue
    const blocked = WINNING_LINES[lineIndex].some(
      (other) => other !== cell && board[other] === them
    )
    if (!blocked) live++
  }
  return live
}

export type EvaluateOptions = {
  sight?: Sight
  /** Whether to reward building towards a fork. The weaker difficulties cannot see that far. */
  seesForks?: boolean
  weights?: Weights
}

/**
 * What playing `cell` is worth to `player`, ignoring outright wins and blocks, which the choosers
 * handle before ever asking for a score.
 */
export function scoreCell(
  board: Board,
  cell: number,
  player: Player,
  { sight = Sight.everything, seesForks = true, weights = DEFAULT_WEIGHTS }: EvaluateOptions = {}
): number {
  const them = opponentOf(player)
  const visible = VISIBLE_LINES[sight]
  let score = 0

  for (const lineIndex of LINES_THROUGH_CELL[cell]) {
    if (!visible.includes(lineIndex)) continue

    let mine = 0
    let theirs = 0
    for (const other of WINNING_LINES[lineIndex]) {
      if (other === cell) continue
      const owner = board[other]
      if (owner === player) mine++
      else if (owner === them) theirs++
    }

    // Contested lines are dead for both sides, whoever nominally owns the geometry.
    if (mine > 0 && theirs > 0) continue
    // Playing here adds one of mine, so the line is worth what it becomes, not what it was.
    if (theirs === 0) score += weights.own[mine + 1]
    else score += weights.deny[theirs]
  }

  if (!seesForks) return score

  const threats = threatsAfter(board, cell, player, sight)
  if (threats >= 2) score += weights.fork

  // Two twos sharing a free cell: whoever takes the overlap makes two threes in one move.
  const after = applyMove(board, cell, player)
  score += forkCells(after, player, sight).length * weights.forkSetup

  return score
}

/**
 * The whole position from `player`'s side, for the search to compare leaves by. Positive means the
 * position favours `player`.
 */
export function scorePosition(
  board: Board,
  player: Player,
  sight: Sight = Sight.everything,
  weights: Weights = DEFAULT_WEIGHTS
): number {
  const them = opponentOf(player)
  let score = 0

  for (const read of readLines(board, player, sight)) {
    if (read.mine > 0 && read.theirs > 0) continue
    if (read.mine > 0) score += weights.own[read.mine]
    else if (read.theirs > 0) score -= weights.own[read.theirs]
  }

  score += forkCells(board, player, sight).length * weights.forkSetup
  score -= forkCells(board, them, sight).length * weights.forkSetup
  return score
}

/**
 * Moves worth considering, best-looking first. Anything forced comes first so a search settles those
 * lines immediately, and the rest are ordered by their static score to make the pruning bite.
 */
export function orderedMoves(
  board: Board,
  player: Player,
  options: EvaluateOptions = {}
): number[] {
  const them = opponentOf(player)
  const wins = winningMoves(board, player, options.sight)
  if (wins.length > 0) return wins

  const blocks = winningMoves(board, them, options.sight)
  if (blocks.length > 0) return blocks

  return legalMoves(board)
    .map((cell) => ({ cell, score: scoreCell(board, cell, player, options) }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.cell)
}
