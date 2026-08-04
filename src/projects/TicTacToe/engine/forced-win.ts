import { Board, Player } from '../tic-tac-toe.types'
import { applyMove, opponentOf } from './board'
import { threatCellCounts, winningMoves } from './threats'

/**
 * Threat-space search: a hunt for a win the opponent cannot escape, however they answer.
 *
 * A forcing move leaves the mover one square from a win, so the reply is dictated: block the square or
 * lose. String enough of those together and the opponent is walked, move by move, into a position where
 * one move makes two wins at once and no single block stops both. This is how 4×4×4 was first solved
 * (Allis, 1994), and it is the shape a person uses to beat a strong bot: not deeper counting, but a
 * chain the bot was obliged to follow to the end.
 *
 * The search is sound but not exhaustive: every win it reports is real, because every opponent reply
 * along the way was forced. It says nothing about positions that need a quiet preparing move, and leaves
 * those to the ordinary search. So it is run first and cheaply, and only as a chance to do better than a
 * heuristic, never as the last word.
 *
 * The nuance that makes it more than a one-sided count: a forced block can itself complete a third piece
 * on some other line, which turns the reply into a threat of the opponent's own and hands them the
 * initiative. That case needs no special handling here. The recursion simply finds, at the next node,
 * that it is now the attacker who must answer a threat, and the chain only survives if the forced block
 * keeps making threats of its own.
 */

export type ForcedWinOptions = {
  /** Reads the clock; injected so tests drive the budget without a wall clock. */
  now: () => number
  /** No proof past this instant: the search gives up and reports nothing rather than overrun. */
  deadline: number
  /** Deepest chain, counted in the attacker's own moves. */
  maxDepth: number
}

type Prover = ForcedWinOptions & {
  /** Latched the first time the budget is found spent, so nothing after it is taken as proved. */
  exhausted: boolean
  memo: Map<string, boolean>
}

function proverFor(options: ForcedWinOptions): Prover {
  return { ...options, exhausted: false, memo: new Map() }
}

/**
 * Whether the budget is spent. Latched rather than asked afresh each time: a node that gives up deeper in
 * the recursion returns the same `false` as a proved "no win", and its caller has to be able to tell the
 * difference before caching the verdict. Every node reads the clock on entry, so the deadline alone bounds
 * the work.
 */
function outOfBudget(prover: Prover): boolean {
  if (prover.exhausted) return true
  if (prover.now() < prover.deadline) return false
  prover.exhausted = true
  return true
}

/** One character per cell plus the side to move: enough to spot a position the search already settled. */
function positionKey(board: Board, side: Player, depth: number): string {
  let key = side === Player.one ? 'x' : 'o'
  for (const cell of board) key += cell === null ? '.' : cell === Player.one ? 'x' : 'o'
  return `${key}|${depth}`
}

/**
 * Every move that forces a reply, forks first, so a win is found on the shortest chain and the pruning
 * bites soonest. A square shared by two of the attacker's two-longs makes two threes at once, which is the
 * unblockable fork the whole search is aiming at. Threes already on the board are outright wins and are
 * handled before this runs.
 */
function orderedForcing(board: Board, attacker: Player): number[] {
  return [...threatCellCounts(board, attacker).entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([cell]) => cell)
}

/**
 * The attacker's candidate moves at one node. A live opponent threat dictates the move: block it, or the
 * chain is already lost. With nothing forced on the attacker, every forcing move is fair game.
 */
function attackerCandidates(board: Board, attacker: Player): number[] | null {
  const defenderThreats = winningMoves(board, opponentOf(attacker))
  if (defenderThreats.length >= 2) return null // two threats, one move: cannot save it
  if (defenderThreats.length === 1) return [defenderThreats[0]]
  return orderedForcing(board, attacker)
}

/**
 * Whether `attacker`, to move, can force a win within the remaining depth. The opponent's replies are
 * always forced here: they block the single threat or lose outright, so only the attacker's moves branch.
 */
function attackerWins(board: Board, attacker: Player, depth: number, prover: Prover): boolean {
  if (outOfBudget(prover)) return false

  const defender = opponentOf(attacker)
  if (winningMoves(board, attacker).length > 0) return true
  if (depth <= 0) return false

  const key = positionKey(board, attacker, depth)
  const cached = prover.memo.get(key)
  if (cached !== undefined) return cached

  const candidates = attackerCandidates(board, attacker)
  if (candidates === null) {
    prover.memo.set(key, false)
    return false
  }

  let result = false
  for (const move of candidates) {
    if (outOfBudget(prover)) break
    const afterAttack = applyMove(board, move, attacker)
    const myThreats = winningMoves(afterAttack, attacker)
    if (myThreats.length >= 2) {
      result = true // a fork: the opponent blocks one three and loses to the other
      break
    }
    if (myThreats.length === 0) continue // not forcing: the opponent is free, so nothing is proved
    /* The single threat compels the block. The defender has no win to take instead: `attackerCandidates`
       refused the node on two defender threats and forced the block on one, and the attacker's own move
       only ever adds to lines the attacker holds, so it cannot have raised the defender's count. */
    const afterBlock = applyMove(afterAttack, myThreats[0], defender)
    if (attackerWins(afterBlock, attacker, depth - 1, prover)) {
      result = true
      break
    }
  }

  /* A win is proved outright. A "no win" only counts if nothing along the way gave up on the budget —
     including deeper in the recursion, where the same `false` comes back for both. */
  if (result || !prover.exhausted) prover.memo.set(key, result)
  return result
}

/**
 * The move that begins a forced win for `attacker`, or null when no forced win is proved in budget.
 * Mirrors one level of the search and returns the move rather than a verdict.
 */
export function findForcedWin(
  board: Board,
  attacker: Player,
  options: ForcedWinOptions
): number | null {
  const prover = proverFor(options)
  const defender = opponentOf(attacker)

  const immediate = winningMoves(board, attacker)
  if (immediate.length > 0) return immediate[0]

  const candidates = attackerCandidates(board, attacker)
  if (candidates === null) return null

  for (const move of candidates) {
    if (outOfBudget(prover)) return null
    const afterAttack = applyMove(board, move, attacker)
    const myThreats = winningMoves(afterAttack, attacker)
    if (myThreats.length >= 2) return move
    if (myThreats.length === 0) continue
    // The block is forced for the same reason as in `attackerWins`: the defender's count cannot have risen.
    const afterBlock = applyMove(afterAttack, myThreats[0], defender)
    if (attackerWins(afterBlock, attacker, prover.maxDepth - 1, prover)) return move
  }
  return null
}

/** Whether `attacker`, to move, has a forced win: the defensive question, so a move can be refused. */
export function hasForcedWin(board: Board, attacker: Player, options: ForcedWinOptions): boolean {
  return attackerWins(board, attacker, options.maxDepth, proverFor(options))
}
