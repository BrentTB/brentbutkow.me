import { Board, Difficulty, Player } from '../tic-tac-toe.types'
import { legalMoves, opponentOf } from './board'
import { Weights, scoreCell } from './evaluate'
import { Rng, pickOne, pickWeighted } from './rng'
import { findBestMove } from './search'
import { Sight, threatCells, winningMoves } from './threats'

/**
 * Choosing the computer's move.
 *
 * The weaker tiers are not the strong one with noise added. A bot that plays well and then throws a
 * move away at random reads as broken; a weak human reads as someone who cannot see the whole board. So
 * weakness is modelled as restricted sight, and the mistakes it makes have a reason behind them: an
 * easy opponent builds tidy rows inside one layer and never looks up, which is exactly how a beginner
 * loses this game.
 */

type Personality = {
  /** Which of the 76 lines this tier notices at all. */
  sight: Sight
  /** Chance of taking a win it can see. */
  takesWin: number
  /** Chance of blocking a loss it can see. */
  blocks: number
  /**
   * Chance of taking the shortcut that extends a line it already has two of, picked at random from the
   * cells that would. A blunt instrument for the weak tiers; the strong one scores instead.
   */
  builds: number
  /** Whether it understands that two twos sharing a cell is worth playing for. */
  seesForks: boolean
  /**
   * How sharply it prefers its best-looking option. 1 picks nearly proportionally to score, so it
   * often takes a merely decent cell; higher numbers converge on the best one.
   */
  sharpness: number
}

export const PERSONALITIES: Record<Exclude<Difficulty, 'godly'>, Personality> = {
  easy: {
    // Blind to every line that climbs between layers: all the rods and all the 3D diagonals.
    sight: Sight.oneLayer,
    takesWin: 0.7,
    blocks: 0.5,
    builds: 0.45,
    seesForks: false,
    sharpness: 1,
  },
  medium: {
    // Sees everything except the four corner-to-corner body diagonals.
    sight: Sight.noBodyDiagonals,
    takesWin: 1,
    blocks: 1,
    builds: 0.75,
    seesForks: false,
    sharpness: 2.5,
  },
  hard: {
    sight: Sight.everything,
    takesWin: 1,
    blocks: 1,
    /**
     * Nought on purpose. The shortcut grabs a random cell that extends a two, which would pre-empt the
     * scoring on almost every move and pick blindly between the options it found. The score already
     * rates making a three far above building a two, so it extends lines when that is genuinely best
     * and weighs the alternatives when it is not.
     */
    builds: 0,
    seesForks: true,
    sharpness: 12,
  },
}

/**
 * Fallback search budget for callers that do not set one, such as the engine's own tests. The game
 * passes its own, derived from how long the computer appears to think.
 */
const GODLY_BUDGET_MS = 700

export type ChooseOptions = {
  rng: Rng
  /** Injected so a test can drive the search budget without a wall clock. */
  now?: () => number
  budgetMs?: number
  /** Overrides the tuned positional weights. Used by the self-play tuner, not by the game. */
  weights?: Weights
}

/**
 * The computer's move, or null on a full board.
 *
 * Order of business is the same at every tier, only the reliability and the sight change: take a win,
 * else deny theirs, else build, else take the best-looking square. Winning beats blocking, and blocking
 * beats setting anything up.
 */
export function chooseMove(
  board: Board,
  player: Player,
  difficulty: Difficulty,
  { rng, now, budgetMs = GODLY_BUDGET_MS, weights }: ChooseOptions
): number | null {
  const free = legalMoves(board)
  if (free.length === 0) return null

  if (difficulty === 'godly') {
    return findBestMove(board, player, { budgetMs, now })?.move ?? null
  }

  const personality = PERSONALITIES[difficulty]
  const { sight } = personality
  const them = opponentOf(player)

  const wins = winningMoves(board, player, sight)
  if (wins.length > 0 && rng() < personality.takesWin) {
    return pickOne(wins, rng) ?? free[0]
  }

  const losses = winningMoves(board, them, sight)
  if (losses.length > 0 && rng() < personality.blocks) {
    return pickOne(losses, rng) ?? free[0]
  }

  // Extending a line it already has two of: the obvious constructive move at this level.
  const builds = threatCells(board, player, sight).filter((cell) => board[cell] === null)
  if (builds.length > 0 && rng() < personality.builds) {
    return pickOne(builds, rng) ?? free[0]
  }

  return pickByScore(board, free, player, personality, rng, weights)
}

/**
 * A weighted pick over the static scores. Weighting rather than taking the maximum is what keeps the
 * weak tiers looking human: they play a reasonable cell most of the time and a merely adequate one
 * often enough to be beatable, instead of alternating between perfect and nonsensical.
 */
function pickByScore(
  board: Board,
  free: readonly number[],
  player: Player,
  { sight, seesForks, sharpness }: Personality,
  rng: Rng,
  weights?: Weights
): number {
  const scores = free.map((cell) => scoreCell(board, cell, player, { sight, seesForks, weights }))
  const lowest = Math.min(...scores)
  // Shift so the worst option still carries a little weight, then bias towards the better ones.
  const bias = scores.map((score) => Math.pow(score - lowest + 1, sharpness))
  return pickWeighted(free, bias, rng) ?? free[0]
}
