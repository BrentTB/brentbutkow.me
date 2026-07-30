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
 * What a line holding `held` of my pieces and none of the opponent's is worth, for `held` of 0 to 4.
 *
 * The jump at three is the point: a line one move from finishing forces a reply, which is worth far
 * more than the tidy two-in-a-row that led to it.
 */
const OWN_LINE_VALUE = [0, 1, 6, 90, 900] as const

/**
 * What denying a line is worth, by how many of the opponent's pieces sit on it, for 0 to 4.
 *
 * Graded rather than flat. Spoiling a line they hold three of is close to compulsory. Spoiling one they
 * hold two of is real value, a little under building a second of my own, and it stacks with whatever
 * else the same cell does. Sitting on a line they have merely started counts for very little, but not
 * for nothing: all else equal, take the square that is also in their way.
 */
const DENY_LINE_VALUE = [0, 2, 22, 700, 0] as const

/** A move that leaves two lines one short wins next turn unless the reply wins outright. */
export const FORK_VALUE = 4000

/** Leaving a cell that would become a fork is the position the strong difficulties play towards. */
const FORK_SETUP_VALUE = 260

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
}

/**
 * What playing `cell` is worth to `player`, ignoring outright wins and blocks, which the choosers
 * handle before ever asking for a score.
 */
export function scoreCell(
  board: Board,
  cell: number,
  player: Player,
  { sight = Sight.everything, seesForks = true }: EvaluateOptions = {}
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
    if (theirs === 0) score += OWN_LINE_VALUE[mine + 1]
    else score += DENY_LINE_VALUE[theirs]
  }

  if (!seesForks) return score

  const threats = threatsAfter(board, cell, player, sight)
  if (threats >= 2) score += FORK_VALUE

  // Two twos sharing a free cell: whoever takes the overlap makes two threes in one move.
  const after = applyMove(board, cell, player)
  score += forkCells(after, player, sight).length * FORK_SETUP_VALUE

  return score
}

/**
 * The whole position from `player`'s side, for the search to compare leaves by. Positive means the
 * position favours `player`.
 */
export function scorePosition(
  board: Board,
  player: Player,
  sight: Sight = Sight.everything
): number {
  const them = opponentOf(player)
  let score = 0

  for (const read of readLines(board, player, sight)) {
    if (read.mine > 0 && read.theirs > 0) continue
    if (read.mine > 0) score += OWN_LINE_VALUE[read.mine]
    else if (read.theirs > 0) score -= OWN_LINE_VALUE[read.theirs]
  }

  score += forkCells(board, player, sight).length * FORK_SETUP_VALUE
  score -= forkCells(board, them, sight).length * FORK_SETUP_VALUE
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
