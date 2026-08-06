import { describe, expect, it } from 'vitest'
import { Board, BoardSize, Player } from '../othello.types'
import { createBoard, idx, legalMoves } from './board'
import { findBestMove } from './search'

/** A clock frozen at zero, so the whole budget is always available and the search runs in full. */
const frozenClock = () => () => 0

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
