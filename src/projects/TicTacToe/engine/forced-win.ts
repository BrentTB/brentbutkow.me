import { Board, Player } from '../tic-tac-toe.types'
import { applyMove, opponentOf } from './board'
import { BOARD_SIZE } from './lines'
import { Sight, readLines, winningMoves } from './threats'

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

/** A win one move deep needs at least two of mine already on a line: a two, played to a three. */
const PIECES_FOR_THREAT = BOARD_SIZE - 2

export type ForcedWinOptions = {
  /** Reads the clock; injected so tests drive the budget without a wall clock. */
  now: () => number
  /** No proof past this instant: the search gives up and reports nothing rather than overrun. */
  deadline: number
  /** Deepest chain, counted in the attacker's own moves. */
  maxDepth: number
  sight?: Sight
  /** Hard stop on work, so a thicket of threats cannot run away with the budget. */
  nodeCap?: number
}

const DEFAULT_NODE_CAP = 120_000

type Prover = {
  now: () => number
  deadline: number
  maxDepth: number
  sight: Sight
  nodeCap: number
  nodes: number
  memo: Map<string, boolean>
}

function proverFor(options: ForcedWinOptions): Prover {
  return {
    now: options.now,
    deadline: options.deadline,
    maxDepth: options.maxDepth,
    sight: options.sight ?? Sight.everything,
    nodeCap: options.nodeCap ?? DEFAULT_NODE_CAP,
    nodes: 0,
    memo: new Map(),
  }
}

/** One character per cell plus the side to move: enough to spot a position the search already settled. */
function positionKey(board: Board, side: Player, depth: number): string {
  let key = side === Player.one ? 'x' : 'o'
  for (const cell of board) key += cell === null ? '.' : cell === Player.one ? 'x' : 'o'
  return `${key}|${depth}`
}

/**
 * Empty cells that make at least one threat, each mapped to how many. Every threat comes from a line the
 * attacker holds two of and the opponent none: playing either empty square turns the two into a three.
 * A square shared by two such lines makes two threes at once, which is the unblockable fork the whole
 * search is aiming at. Threes already on the board are outright wins and are handled before this runs.
 */
function forcingMoves(board: Board, attacker: Player, sight: Sight): Map<number, number> {
  const threats = new Map<number, number>()
  for (const read of readLines(board, attacker, sight)) {
    if (read.mine !== PIECES_FOR_THREAT || read.theirs !== 0) continue
    for (const empty of read.empties) threats.set(empty, (threats.get(empty) ?? 0) + 1)
  }
  return threats
}

/** Forcing moves, forks first, so a win is found on the shortest chain and the pruning bites soonest. */
function orderedForcing(board: Board, attacker: Player, sight: Sight): number[] {
  return [...forcingMoves(board, attacker, sight).entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([cell]) => cell)
}

/**
 * The attacker's candidate moves at one node. A live opponent threat dictates the move: block it, or the
 * chain is already lost. With nothing forced on the attacker, every forcing move is fair game.
 */
function attackerCandidates(board: Board, attacker: Player, prover: Prover): number[] | null {
  const defender = opponentOf(attacker)
  const defenderThreats = winningMoves(board, defender, prover.sight)
  if (defenderThreats.length >= 2) return null // two threats, one move: cannot save it
  if (defenderThreats.length === 1) return [defenderThreats[0]]
  return orderedForcing(board, attacker, prover.sight)
}

/**
 * Whether `attacker`, to move, can force a win within the remaining depth. The opponent's replies are
 * always forced here: they block the single threat or lose outright, so only the attacker's moves branch.
 */
function attackerWins(board: Board, attacker: Player, depth: number, prover: Prover): boolean {
  if (prover.now() >= prover.deadline || ++prover.nodes > prover.nodeCap) return false

  const defender = opponentOf(attacker)
  if (winningMoves(board, attacker, prover.sight).length > 0) return true
  if (depth <= 0) return false

  const key = positionKey(board, attacker, depth)
  const cached = prover.memo.get(key)
  if (cached !== undefined) return cached

  const candidates = attackerCandidates(board, attacker, prover)
  if (candidates === null) {
    prover.memo.set(key, false)
    return false
  }

  let result = false
  let settled = true
  for (const move of candidates) {
    if (prover.now() >= prover.deadline) {
      settled = false // cut short: this node's "no win" is unproven, so it must not be cached
      break
    }
    const afterAttack = applyMove(board, move, attacker)
    const myThreats = winningMoves(afterAttack, attacker, prover.sight)
    if (myThreats.length >= 2) {
      result = true // a fork: the opponent blocks one three and loses to the other
      break
    }
    if (myThreats.length === 0) continue // not forcing: the opponent is free, so nothing is proved
    // The one threat compels a block, unless the opponent can simply win first instead.
    if (winningMoves(afterAttack, defender, prover.sight).length > 0) continue
    const afterBlock = applyMove(afterAttack, myThreats[0], defender)
    if (attackerWins(afterBlock, attacker, depth - 1, prover)) {
      result = true
      break
    }
  }

  if (result || settled) prover.memo.set(key, result)
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

  const immediate = winningMoves(board, attacker, prover.sight)
  if (immediate.length > 0) return immediate[0]

  const candidates = attackerCandidates(board, attacker, prover)
  if (candidates === null) return null

  for (const move of candidates) {
    if (prover.now() >= prover.deadline) return null
    const afterAttack = applyMove(board, move, attacker)
    const myThreats = winningMoves(afterAttack, attacker, prover.sight)
    if (myThreats.length >= 2) return move
    if (myThreats.length === 0) continue
    if (winningMoves(afterAttack, defender, prover.sight).length > 0) continue
    const afterBlock = applyMove(afterAttack, myThreats[0], defender)
    if (attackerWins(afterBlock, attacker, prover.maxDepth - 1, prover)) return move
  }
  return null
}

/** Whether `attacker`, to move, has a forced win: the defensive question, so a move can be refused. */
export function hasForcedWin(board: Board, attacker: Player, options: ForcedWinOptions): boolean {
  return attackerWins(board, attacker, options.maxDepth, proverFor(options))
}
