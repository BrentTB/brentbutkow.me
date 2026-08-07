import { describe, expect, it } from 'vitest'
import { Board, BoardSize, Difficulty, Player } from '../othello.types'
import { seededRng } from '../../../utils/rng'
import { createBoard, idx, legalMoves } from './board'
import { chooseMove } from './opponent'
import { findBestMove } from './search'

const frozenClock = () => () => 0

describe('chooseMove', () => {
  it('returns null when there is no legal move (a pass)', () => {
    const size = BoardSize.small
    const board: Board = { cells: new Array(size * size).fill(null), size }
    expect(chooseMove(board, Player.dark, Difficulty.beginner, { rng: seededRng(1) })).toBeNull()
  })

  it('always returns a legal move at every tier', () => {
    const board = createBoard(BoardSize.standard)
    for (const difficulty of [Difficulty.beginner, Difficulty.intermediate, Difficulty.hard]) {
      const move = chooseMove(board, Player.dark, difficulty, {
        rng: seededRng(42),
        now: frozenClock(),
      })
      expect(legalMoves(board, Player.dark)).toContain(move)
    }
  })

  it('beginner leans towards the move that flips the most discs', () => {
    // A position where one legal move flips a long run and another flips a single disc.
    const size = BoardSize.standard
    const cells = new Array<Player | null>(size * size).fill(null)
    // Big flip: dark at (0,5) flips lights at (0,1..4) against dark at (0,0).
    cells[idx(0, 0, size)] = Player.dark
    for (let c = 1; c <= 4; c++) cells[idx(0, c, size)] = Player.light
    // Small flip: dark at (5,2) flips one light at (5,1) against dark at (5,0).
    cells[idx(5, 0, size)] = Player.dark
    cells[idx(5, 1, size)] = Player.light
    const board: Board = { cells, size }
    const bigFlip = idx(0, 5, size)

    const rng = seededRng(7)
    let big = 0
    const draws = 400
    for (let i = 0; i < draws; i++) {
      if (chooseMove(board, Player.dark, Difficulty.beginner, { rng }) === bigFlip) big++
    }
    expect(big / draws).toBeGreaterThan(0.6)
  })

  it('hard delegates to the search', () => {
    const board = createBoard(BoardSize.standard)
    const viaChoose = chooseMove(board, Player.dark, Difficulty.hard, {
      rng: seededRng(1),
      now: frozenClock(),
      budgetMs: 200,
    })
    const viaSearch = findBestMove(board, Player.dark, { now: frozenClock(), budgetMs: 200 })
    expect(viaChoose).toBe(viaSearch?.move)
  })
})
