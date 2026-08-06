import { describe, expect, it } from 'vitest'
import { Board, BoardSize, Player } from '../othello.types'
import {
  applyMove,
  coordOf,
  countPieces,
  createBoard,
  getCapturesAt,
  hasLegalMove,
  idx,
  isGameOver,
  legalMoves,
  opponentOf,
} from './board'

const at = (board: Board, row: number, col: number) => board.cells[idx(row, col, board.size)]

describe('createBoard', () => {
  it('places the four centre discs in the standard setup', () => {
    const board = createBoard(BoardSize.standard)
    expect(at(board, 3, 3)).toBe(Player.light)
    expect(at(board, 3, 4)).toBe(Player.dark)
    expect(at(board, 4, 3)).toBe(Player.dark)
    expect(at(board, 4, 4)).toBe(Player.light)
  })

  it('starts every other square empty, at each offered size', () => {
    for (const size of [BoardSize.small, BoardSize.standard, BoardSize.large]) {
      const board = createBoard(size)
      expect(board.cells).toHaveLength(size * size)
      expect(countPieces(board)).toEqual({ dark: 2, light: 2 })
    }
  })
})

describe('idx / coordOf', () => {
  it('round-trips index and coordinate', () => {
    const size = BoardSize.standard
    for (const index of [0, 7, 8, 27, 63]) {
      const { row, col } = coordOf(index, size)
      expect(idx(row, col, size)).toBe(index)
    }
  })
})

describe('getCapturesAt', () => {
  it('flips the single flanked disc on an opening move', () => {
    const board = createBoard(BoardSize.standard)
    // Dark plays d3 (row 2, col 3): flanks the light at d4 (row 3, col 3) against the dark at d5.
    const flipped = getCapturesAt(board, idx(2, 3, board.size), Player.dark)
    expect(flipped).toEqual([idx(3, 3, board.size)])
  })

  it('returns nothing for a move that flanks no disc', () => {
    const board = createBoard(BoardSize.standard)
    expect(getCapturesAt(board, idx(0, 0, board.size), Player.dark)).toEqual([])
  })

  it('returns nothing for an occupied cell', () => {
    const board = createBoard(BoardSize.standard)
    expect(getCapturesAt(board, idx(3, 3, board.size), Player.dark)).toEqual([])
  })

  it('walks a run of several discs in one direction', () => {
    const size = BoardSize.standard
    // Row 3: dark at col 1, light at cols 2,3,4, empty at col 5. Dark at col 5 flips 2,3,4.
    const cells = new Array(size * size).fill(null)
    cells[idx(3, 1, size)] = Player.dark
    cells[idx(3, 2, size)] = Player.light
    cells[idx(3, 3, size)] = Player.light
    cells[idx(3, 4, size)] = Player.light
    const board: Board = { cells, size }
    const flipped = getCapturesAt(board, idx(3, 5, size), Player.dark)
    expect(flipped.sort()).toEqual([idx(3, 2, size), idx(3, 3, size), idx(3, 4, size)].sort())
  })
})

describe('legalMoves', () => {
  it('gives dark four opening moves on the standard board', () => {
    const board = createBoard(BoardSize.standard)
    expect(legalMoves(board, Player.dark).sort((a, b) => a - b)).toEqual(
      [idx(2, 3, 8), idx(3, 2, 8), idx(4, 5, 8), idx(5, 4, 8)].sort((a, b) => a - b)
    )
  })
})

describe('applyMove', () => {
  it('places the disc and flips the captured run', () => {
    const board = createBoard(BoardSize.standard)
    const move = idx(2, 3, board.size)
    const { board: next, flipped } = applyMove(board, move, Player.dark)
    expect(next.cells[move]).toBe(Player.dark)
    expect(flipped).toEqual([idx(3, 3, board.size)])
    expect(next.cells[idx(3, 3, board.size)]).toBe(Player.dark)
    // Original board is untouched.
    expect(board.cells[move]).toBeNull()
  })

  it('leaves the board unchanged for an illegal move', () => {
    const board = createBoard(BoardSize.standard)
    const result = applyMove(board, idx(0, 0, board.size), Player.dark)
    expect(result.board).toBe(board)
    expect(result.flipped).toEqual([])
  })
})

describe('opponentOf', () => {
  it('swaps the two colours', () => {
    expect(opponentOf(Player.dark)).toBe(Player.light)
    expect(opponentOf(Player.light)).toBe(Player.dark)
  })
})

describe('isGameOver / hasLegalMove', () => {
  it('is not over at the start', () => {
    expect(isGameOver(createBoard(BoardSize.standard))).toBe(false)
  })

  it('is over on a full board', () => {
    const size = BoardSize.small
    const board: Board = { cells: new Array(size * size).fill(Player.dark), size }
    expect(hasLegalMove(board, Player.dark)).toBe(false)
    expect(hasLegalMove(board, Player.light)).toBe(false)
    expect(isGameOver(board)).toBe(true)
  })
})

describe('countPieces', () => {
  it('tallies each colour', () => {
    const board = createBoard(BoardSize.standard)
    const { board: next } = applyMove(board, idx(2, 3, board.size), Player.dark)
    expect(countPieces(next)).toEqual({ dark: 4, light: 1 })
  })
})
