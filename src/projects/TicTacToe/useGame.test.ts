import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MAX_HISTORY, useGame } from './useGame'
import { BOARD_SIZE, CELL_COUNT, cellIndex } from './engine/lines'
import { Player } from './tic-tac-toe.types'

/**
 * An order for filling all 64 cells that never completes a line for whoever is to move, so the board ends
 * full with nobody winning.
 *
 * Found by search and pinned here rather than computed at test time: filling in index order wins on the
 * thirteenth move, and hunting for a drawing order is far too slow to do on every run.
 */
const DRAWING_ORDER = [
  8, 46, 36, 38, 21, 6, 33, 16, 20, 11, 18, 60, 29, 61, 31, 53, 63, 62, 12, 42, 23, 13, 24, 0, 41,
  5, 32, 50, 44, 22, 45, 17, 56, 3, 14, 40, 4, 28, 2, 15, 59, 30, 49, 47, 39, 43, 9, 48, 51, 1, 54,
  25, 57, 35, 19, 52, 10, 37, 34, 27, 7, 55, 26, 58,
]

describe('useGame', () => {
  it('starts empty with player one to move', () => {
    const { result } = renderHook(() => useGame())
    expect(result.current.currentPlayer).toBe(Player.one)
    expect(result.current.win).toBeNull()
    expect(result.current.isDraw).toBe(false)
    expect(result.current.board.every((cell) => cell === null)).toBe(true)
  })

  it('alternates turns as moves are played', () => {
    const { result } = renderHook(() => useGame())

    act(() => result.current.playAt(0))
    expect(result.current.board[0]).toBe(Player.one)
    expect(result.current.currentPlayer).toBe(Player.two)

    act(() => result.current.playAt(1))
    expect(result.current.board[1]).toBe(Player.two)
    expect(result.current.currentPlayer).toBe(Player.one)
  })

  it('ignores a move onto an occupied cell without passing the turn', () => {
    const { result } = renderHook(() => useGame())

    act(() => result.current.playAt(7))
    act(() => result.current.playAt(7))

    expect(result.current.board[7]).toBe(Player.one)
    expect(result.current.currentPlayer).toBe(Player.two)
  })

  it('records the winning line and keeps the winner as the current player', () => {
    const { result } = renderHook(() => useGame())

    // Player one takes a rod while player two answers elsewhere.
    for (let layer = 0; layer < BOARD_SIZE; layer++) {
      act(() => result.current.playAt(cellIndex(0, 0, layer)))
      if (layer < BOARD_SIZE - 1) act(() => result.current.playAt(cellIndex(3, 3, layer)))
    }

    expect(result.current.win).not.toBeNull()
    expect(result.current.win?.player).toBe(Player.one)
    expect(result.current.win?.cells).toHaveLength(BOARD_SIZE)
    expect(result.current.currentPlayer).toBe(Player.one)
  })

  it('refuses further moves once the game is won', () => {
    const { result } = renderHook(() => useGame())

    for (let layer = 0; layer < BOARD_SIZE; layer++) {
      act(() => result.current.playAt(cellIndex(0, 0, layer)))
      if (layer < BOARD_SIZE - 1) act(() => result.current.playAt(cellIndex(3, 3, layer)))
    }
    const settled = result.current.board

    act(() => result.current.playAt(cellIndex(1, 1, 1)))
    expect(result.current.board).toBe(settled)
  })

  /**
   * A truthiness check for emptiness would report a full board as still in play.
   *
   * Filling in index order does not reach a draw, so a known drawing order is used and the full board with
   * no winner is asserted outright.
   */
  it('reports a draw when the board fills with no line', () => {
    const { result } = renderHook(() => useGame())

    act(() => {
      for (const index of DRAWING_ORDER) result.current.playAt(index)
    })

    expect(result.current.board.filter((cell) => cell !== null)).toHaveLength(CELL_COUNT)
    expect(result.current.win).toBeNull()
    expect(result.current.isDraw).toBe(true)
  })

  it('clears the board, the winner, and the turn on a new game', () => {
    const { result } = renderHook(() => useGame())

    act(() => result.current.playAt(0))
    act(() => result.current.newGame())

    expect(result.current.board.every((cell) => cell === null)).toBe(true)
    expect(result.current.currentPlayer).toBe(Player.one)
    expect(result.current.win).toBeNull()
    expect(result.current.isDraw).toBe(false)
  })
})

describe('useGame — undo and redo', () => {
  it('has nothing to undo or redo on a fresh game', () => {
    const { result } = renderHook(() => useGame())
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
  })

  it('takes back a move and hands the turn back', () => {
    const { result } = renderHook(() => useGame())

    act(() => result.current.playAt(5))
    expect(result.current.currentPlayer).toBe(Player.two)

    act(() => result.current.undo())
    expect(result.current.board[5]).toBeNull()
    expect(result.current.currentPlayer).toBe(Player.one)
    expect(result.current.canRedo).toBe(true)
  })

  it('replays an undone move exactly', () => {
    const { result } = renderHook(() => useGame())

    act(() => result.current.playAt(5))
    act(() => result.current.playAt(9))
    act(() => result.current.undo())
    act(() => result.current.undo())
    expect(result.current.board[5]).toBeNull()

    act(() => result.current.redo())
    expect(result.current.board[5]).toBe(Player.one)
    act(() => result.current.redo())
    expect(result.current.board[9]).toBe(Player.two)
    expect(result.current.canRedo).toBe(false)
  })

  it('takes back a win, so the board becomes playable again', () => {
    const { result } = renderHook(() => useGame())

    for (let layer = 0; layer < BOARD_SIZE; layer++) {
      act(() => result.current.playAt(cellIndex(0, 0, layer)))
      if (layer < BOARD_SIZE - 1) act(() => result.current.playAt(cellIndex(3, 3, layer)))
    }
    expect(result.current.win).not.toBeNull()

    act(() => result.current.undo())
    expect(result.current.win).toBeNull()

    act(() => result.current.playAt(cellIndex(2, 2, 2)))
    expect(result.current.board[cellIndex(2, 2, 2)]).toBe(Player.one)
  })

  /** The whole point of making New game a snapshot: a game abandoned by accident is recoverable. */
  it('undoes a new game and restores the game that was abandoned', () => {
    const { result } = renderHook(() => useGame())

    act(() => result.current.playAt(1))
    act(() => result.current.playAt(2))
    act(() => result.current.newGame())
    expect(result.current.board.every((cell) => cell === null)).toBe(true)

    act(() => result.current.undo())
    expect(result.current.board[1]).toBe(Player.one)
    expect(result.current.board[2]).toBe(Player.two)
    expect(result.current.currentPlayer).toBe(Player.one)
  })

  it('discards the redo branch once a different move is played', () => {
    const { result } = renderHook(() => useGame())

    act(() => result.current.playAt(5))
    act(() => result.current.undo())
    expect(result.current.canRedo).toBe(true)

    act(() => result.current.playAt(7))
    expect(result.current.canRedo).toBe(false)
    expect(result.current.board[7]).toBe(Player.one)
    expect(result.current.board[5]).toBeNull()
  })

  /** Guards the closure trap: reading the board from the render would collapse a batch into one move. */
  it('applies every move when several land in the same batch', () => {
    const { result } = renderHook(() => useGame())

    act(() => {
      result.current.playAt(0)
      result.current.playAt(1)
      result.current.playAt(2)
    })

    expect(result.current.board[0]).toBe(Player.one)
    expect(result.current.board[1]).toBe(Player.two)
    expect(result.current.board[2]).toBe(Player.one)
  })

  it('stops at the ends instead of running off either edge', () => {
    const { result } = renderHook(() => useGame())

    act(() => result.current.playAt(3))
    act(() => {
      result.current.undo()
      result.current.undo()
      result.current.undo()
    })
    expect(result.current.canUndo).toBe(false)
    expect(result.current.board[3]).toBeNull()

    act(() => {
      result.current.redo()
      result.current.redo()
    })
    expect(result.current.canRedo).toBe(false)
    expect(result.current.board[3]).toBe(Player.one)
  })

  /** The cap only bites if someone leans on New game, and dropping the oldest is kinder than growing forever. */
  it('drops the oldest positions once the history is full', () => {
    const { result } = renderHook(() => useGame())

    act(() => result.current.playAt(0))
    act(() => {
      for (let round = 0; round < MAX_HISTORY + 5; round++) result.current.newGame()
    })

    expect(result.current.board.every((cell) => cell === null)).toBe(true)
    expect(result.current.canRedo).toBe(false)

    // The first move is long gone, so stepping all the way back cannot reach it again.
    act(() => {
      for (let step = 0; step < MAX_HISTORY + 10; step++) result.current.undo()
    })
    expect(result.current.canUndo).toBe(false)
    expect(result.current.board[0]).toBeNull()
  })

  it('keeps an ignored move out of the history', () => {
    const { result } = renderHook(() => useGame())

    act(() => result.current.playAt(4))
    act(() => result.current.playAt(4)) // already taken
    act(() => result.current.undo())

    expect(result.current.board[4]).toBeNull()
    expect(result.current.canUndo).toBe(false)
  })
})

describe('useGame — a computer holding a seat', () => {
  /**
   * A single undo has to take back the computer's reply as well as your own move, or the turn goes
   * straight back to it and the undo appears to do nothing.
   */
  it('takes back the pair in one step', () => {
    const { result } = renderHook(() => useGame(Player.two))

    act(() => result.current.playAt(1)) // you
    act(() => result.current.playAt(2)) // the computer's reply
    act(() => result.current.undo())

    expect(result.current.board[1]).toBeNull()
    expect(result.current.board[2]).toBeNull()
    expect(result.current.currentPlayer).toBe(Player.one)
  })

  it('replays the pair in one step', () => {
    const { result } = renderHook(() => useGame(Player.two))

    act(() => result.current.playAt(1))
    act(() => result.current.playAt(2))
    act(() => result.current.undo())
    act(() => result.current.redo())

    expect(result.current.board[1]).toBe(Player.one)
    expect(result.current.board[2]).toBe(Player.two)
  })

  /**
   * Regression: history must never rest where the computer is to move. Landing there starts its turn
   * again, and the reply it lands drops every position ahead of the cursor — so the game the player
   * was stepping back through is destroyed rather than restored, with nothing left to redo.
   *
   * The computer opening means the playable positions are the odd ones, which is where a plain
   * "cursor > 0" test for undo goes wrong.
   */
  it('has nothing to undo when only the computer has moved', () => {
    const { result } = renderHook(() => useGame(Player.one))

    act(() => result.current.playAt(1)) // the computer's opening

    expect(result.current.currentPlayer).toBe(Player.two)
    expect(result.current.canUndo).toBe(false)
  })

  it('steps back past the computer rather than onto its turn', () => {
    const { result } = renderHook(() => useGame(Player.one))

    act(() => result.current.playAt(1)) // computer opens
    act(() => result.current.playAt(2)) // you
    act(() => result.current.playAt(3)) // computer replies

    act(() => result.current.undo())

    expect(result.current.board[1]).toBe(Player.one)
    expect(result.current.board[2]).toBeNull()
    expect(result.current.board[3]).toBeNull()
    expect(result.current.currentPlayer).toBe(Player.two)
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(true)
  })

  it('can still redo into a finished game', () => {
    const { result } = renderHook(() => useGame(Player.two))

    for (let layer = 0; layer < BOARD_SIZE; layer++) {
      act(() => result.current.playAt(cellIndex(0, 0, layer)))
      if (layer < BOARD_SIZE - 1) act(() => result.current.playAt(cellIndex(3, 3, layer)))
    }
    expect(result.current.win).not.toBeNull()

    act(() => result.current.undo())
    expect(result.current.win).toBeNull()

    act(() => result.current.redo())
    expect(result.current.win).not.toBeNull()
  })

  it('steps one position at a time in a two-player game', () => {
    const { result } = renderHook(() => useGame())

    act(() => result.current.playAt(1))
    act(() => result.current.playAt(2))
    act(() => result.current.undo())

    expect(result.current.board[2]).toBeNull()
    expect(result.current.board[1]).toBe(Player.one)
  })
})

describe('useGame — marking the last move', () => {
  it('has no last move on a fresh game', () => {
    const { result } = renderHook(() => useGame())
    expect(result.current.lastMove).toBeNull()
  })

  it('remembers the cell just played', () => {
    const { result } = renderHook(() => useGame())

    act(() => result.current.playAt(9))
    expect(result.current.lastMove).toBe(9)

    act(() => result.current.playAt(17))
    expect(result.current.lastMove).toBe(17)
  })

  /** Part of the snapshot, so stepping back shows the move that was current then, not a stale one. */
  it('restores the previous last move on undo, and the later one on redo', () => {
    const { result } = renderHook(() => useGame())

    act(() => result.current.playAt(4))
    act(() => result.current.playAt(8))
    act(() => result.current.undo())
    expect(result.current.lastMove).toBe(4)

    act(() => result.current.redo())
    expect(result.current.lastMove).toBe(8)
  })

  it('clears back to nothing when undone to the start', () => {
    const { result } = renderHook(() => useGame())

    act(() => result.current.playAt(4))
    act(() => result.current.undo())
    expect(result.current.lastMove).toBeNull()
  })

  it('clears on a new game', () => {
    const { result } = renderHook(() => useGame())

    act(() => result.current.playAt(4))
    act(() => result.current.newGame())
    expect(result.current.lastMove).toBeNull()
  })

  it('keeps the winning move marked', () => {
    const { result } = renderHook(() => useGame())

    for (let layer = 0; layer < BOARD_SIZE; layer++) {
      act(() => result.current.playAt(cellIndex(0, 0, layer)))
      if (layer < BOARD_SIZE - 1) act(() => result.current.playAt(cellIndex(3, 3, layer)))
    }
    expect(result.current.win).not.toBeNull()
    expect(result.current.lastMove).toBe(cellIndex(0, 0, BOARD_SIZE - 1))
  })

  it('opens with the player the caller names, and keeps doing so on a new game', () => {
    const { result } = renderHook(() => useGame(null, Player.two))
    expect(result.current.currentPlayer).toBe(Player.two)

    act(() => result.current.playAt(0))
    expect(result.current.board[0]).toBe(Player.two)

    act(() => result.current.newGame())
    expect(result.current.currentPlayer).toBe(Player.two)
    expect(result.current.board.every((cell) => cell === null)).toBe(true)
  })

  it('lets a new game name its own opener, whatever the hook was set up with', () => {
    // How an online room starts a game: the opener can change between games without a remount.
    const { result } = renderHook(() => useGame(null, Player.one))

    act(() => result.current.newGame(Player.two))
    expect(result.current.currentPlayer).toBe(Player.two)

    act(() => result.current.newGame(Player.one))
    expect(result.current.currentPlayer).toBe(Player.one)
  })

  it('does not move the marker when an illegal move is ignored', () => {
    const { result } = renderHook(() => useGame())

    act(() => result.current.playAt(4))
    act(() => result.current.playAt(4))
    expect(result.current.lastMove).toBe(4)
  })
})
