import { describe, expect, it } from 'vitest'
import { applyMove, createBoard, isBoardFull, isPlayable, legalMoves, opponentOf } from './board'
import { CELL_COUNT, cellIndex } from './lines'
import { Player } from '../tic-tac-toe.types'

describe('createBoard', () => {
  it('starts with every site empty', () => {
    const board = createBoard()
    expect(board).toHaveLength(CELL_COUNT)
    expect(board.every((cell) => cell === null)).toBe(true)
  })
})

describe('applyMove', () => {
  it('does not mutate the board it was given', () => {
    const board = createBoard()
    const next = applyMove(board, 0, Player.one)
    expect(board[0]).toBeNull()
    expect(next[0]).toBe(Player.one)
  })

  it('refuses to overwrite an occupied cell', () => {
    const board = applyMove(createBoard(), 5, Player.one)
    expect(applyMove(board, 5, Player.two)[5]).toBe(Player.one)
  })

  it('ignores an index outside the board', () => {
    const board = createBoard()
    expect(applyMove(board, CELL_COUNT, Player.one)).toBe(board)
    expect(applyMove(board, -1, Player.one)).toBe(board)
  })
})

describe('isPlayable', () => {
  it('rejects out-of-range indices', () => {
    const board = createBoard()
    expect(isPlayable(board, 0)).toBe(true)
    expect(isPlayable(board, CELL_COUNT)).toBe(false)
    expect(isPlayable(board, -1)).toBe(false)
  })
})

describe('legalMoves', () => {
  it('lists every empty cell and drops the filled ones', () => {
    const board = applyMove(applyMove(createBoard(), 3, Player.one), 9, Player.two)
    const moves = legalMoves(board)
    expect(moves).toHaveLength(CELL_COUNT - 2)
    expect(moves).not.toContain(3)
    expect(moves).not.toContain(9)
  })
})

describe('isBoardFull', () => {
  it('is false while any cell is empty', () => {
    expect(isBoardFull(createBoard())).toBe(false)
    expect(isBoardFull(applyMove(createBoard(), 0, Player.one))).toBe(false)
  })

  /**
   * Guards a truthiness check standing in for an emptiness check. The prototype used
   * `board.every(Boolean)`, which reports a full board as unfinished the moment any slot's value is
   * falsy — a whole class of bug that a numeric player id would walk straight into.
   */
  it('is true once every cell is taken, whatever the slot values are', () => {
    let board = createBoard()
    for (let index = 0; index < CELL_COUNT; index++) {
      board = applyMove(board, index, index % 2 === 0 ? Player.one : Player.two)
    }
    expect(isBoardFull(board)).toBe(true)
    expect(legalMoves(board)).toHaveLength(0)
  })
})

describe('opponentOf', () => {
  it('swaps the two slots and is its own inverse', () => {
    expect(opponentOf(Player.one)).toBe(Player.two)
    expect(opponentOf(Player.two)).toBe(Player.one)
    expect(opponentOf(opponentOf(Player.one))).toBe(Player.one)
  })
})

describe('the move-chooser seam', () => {
  /**
   * Any future opponent picks a move using only these pure helpers, so this is the contract it can
   * rely on: legal moves are always playable, and playing one leaves a board with one fewer.
   */
  it('lets a chooser play any legal move without reaching into the UI', () => {
    const chooseFirst = (board: ReturnType<typeof createBoard>) => legalMoves(board)[0]
    let board = applyMove(createBoard(), cellIndex(0, 0, 0), Player.one)

    const move = chooseFirst(board)
    expect(isPlayable(board, move)).toBe(true)
    board = applyMove(board, move, Player.two)
    expect(legalMoves(board)).toHaveLength(CELL_COUNT - 2)
  })
})
