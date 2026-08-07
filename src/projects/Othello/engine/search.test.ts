import { describe, expect, it } from 'vitest'
import { Board, BoardSize, Player } from '../othello.types'
import {
  applyMove,
  createBoard,
  hasLegalMove,
  idx,
  isGameOver,
  legalMoves,
  opponentOf,
} from './board'
import { findBestMove } from './search'

/** A clock frozen at zero, so the whole budget is always available and the search runs in full. */
const frozenClock = () => () => 0

/**
 * Plays a whole game choosing the first legal move each turn (passing when a side has none), and
 * returns every position along the way. Deterministic, so tests can lean on the late-game positions
 * where forced passes cluster.
 */
function playoutPositions(size: BoardSize): { board: Board; toMove: Player }[] {
  const positions: { board: Board; toMove: Player }[] = []
  let board = createBoard(size)
  let toMove: Player = Player.dark
  while (!isGameOver(board)) {
    positions.push({ board, toMove })
    const moves = legalMoves(board, toMove)
    if (moves.length > 0) board = applyMove(board, moves[0], toMove).board
    toMove = opponentOf(toMove)
  }
  return positions
}

describe('findBestMove', () => {
  it('returns null when the player has no legal move', () => {
    const size = BoardSize.small
    const board: Board = { cells: new Array(size * size).fill(null), size }
    expect(findBestMove(board, Player.dark, { now: frozenClock() })).toBeNull()
  })

  it('always returns a legal move', () => {
    const board = createBoard(BoardSize.standard)
    const result = findBestMove(board, Player.dark, { now: frozenClock(), maxDepth: 3 })
    expect(result).not.toBeNull()
    expect(legalMoves(board, Player.dark)).toContain(result?.move)
  })

  it('is deterministic for the same board and budget', () => {
    const board = createBoard(BoardSize.standard)
    const a = findBestMove(board, Player.dark, { now: frozenClock(), maxDepth: 3 })
    const b = findBestMove(board, Player.dark, { now: frozenClock(), maxDepth: 3 })
    expect(a?.move).toBe(b?.move)
  })

  it('terminates when a forced pass sits at the search horizon', () => {
    // Regression: the pass branch used to run before the depth cutoff, and the cutoff tested `=== 0`,
    // so a pass at depth 0 recursed to -1 and expanded the whole remaining tree — a hang under a frozen
    // clock. The deterministic 8×8 playout forces passes with dozens of empties still on the board, so
    // searching across it drives the pass into the horizon; every search must return, not hang.
    const positions = playoutPositions(BoardSize.standard)
    const passesExist = positions.some(
      ({ board, toMove }) => !hasLegalMove(board, toMove) && hasLegalMove(board, opponentOf(toMove))
    )
    expect(passesExist).toBe(true)
    for (const { board, toMove } of positions) {
      if (!hasLegalMove(board, toMove)) continue
      const result = findBestMove(board, toMove, { now: frozenClock(), maxDepth: 4 })
      expect(legalMoves(board, toMove)).toContain(result?.move)
    }
  })

  it('takes the only move in a one-empty endgame', () => {
    const size = BoardSize.small
    const cells = new Array(size * size).fill(Player.dark)
    cells[idx(0, 0, size)] = null
    cells[idx(0, 1, size)] = Player.light // dark at (0,2) flanks it, so (0,0) is legal and flips it
    const board: Board = { cells, size }
    const result = findBestMove(board, Player.dark, { now: frozenClock() })
    expect(result?.move).toBe(idx(0, 0, size))
  })
})
