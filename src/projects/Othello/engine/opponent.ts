import { Board, Difficulty, Player } from '../othello.types'
import { Rng, pickWeighted } from './rng'
import { applyMove, getCapturesAt, legalMoves } from './board'
import { Weights, scorePosition } from './evaluate'
import { findBestMove } from './search'

/**
 * Choosing the computer's move.
 *
 * The weaker tiers are not the strong one with noise added — a bot that plays well and then throws a
 * move away reads as broken. Weakness is modelled as limited sight, so its mistakes have a reason: the
 * beginner sees only how many discs a move flips and grabs the most, which is exactly the trap a new
 * player falls into, since a big early flip usually just exposes those discs to a corner-bound reply.
 */

const HowItPicks = {
  /** Weight by raw capture count — grab the most discs, blind to where they sit. */
  captures: 'captures',
  /** Weight by a one-ply positional score — corners, traps, and mobility, but no lookahead. */
  positional: 'positional',
} as const
type HowItPicks = (typeof HowItPicks)[keyof typeof HowItPicks]

type Personality = {
  how: HowItPicks
  /**
   * How sharply it favours its best-looking option. 1 picks nearly in proportion to score, so it often
   * settles for a merely decent move; higher numbers converge on the best one.
   */
  sharpness: number
}

const PERSONALITIES: Record<Exclude<Difficulty, typeof Difficulty.hard>, Personality> = {
  beginner: {
    how: HowItPicks.captures,
    // Low, so among the moves that flip a lot it still wanders — a beginner is not even reliably greedy.
    sharpness: 1.6,
  },
  intermediate: {
    how: HowItPicks.positional,
    // High enough to usually take the positionally best cell, low enough to be beatable.
    sharpness: 6,
  },
}

export type ChooseOptions = {
  rng: Rng
  /** Injected so a test can drive the search budget without a wall clock. */
  now?: () => number
  /** Left off by callers happy with the search's own default. */
  budgetMs?: number
  /** Overrides the tuned positional weights, for the intermediate tier. */
  weights?: Weights
}

/**
 * The computer's move, or null when it has none and must pass.
 */
export function chooseMove(
  board: Board,
  player: Player,
  difficulty: Difficulty,
  { rng, now, budgetMs, weights }: ChooseOptions
): number | null {
  const free = legalMoves(board, player)
  if (free.length === 0) return null

  if (difficulty === Difficulty.hard) {
    return findBestMove(board, player, { budgetMs, now })?.move ?? free[0]
  }

  const { how, sharpness } = PERSONALITIES[difficulty]
  const raw = free.map((move) =>
    how === HowItPicks.captures
      ? getCapturesAt(board, move, player).length
      : scorePosition(applyMove(board, move, player).board, player, weights)
  )

  // Shift so the worst option still carries a little weight, then bias towards the better ones.
  const lowest = Math.min(...raw)
  const bias = raw.map((score) => Math.pow(score - lowest + 1, sharpness))
  return pickWeighted(free, bias, rng) ?? free[0]
}
