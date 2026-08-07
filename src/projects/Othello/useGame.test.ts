import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BoardSize, Player } from './othello.types'
import { MAX_HISTORY, useGame } from './useGame'
import { idx, legalMoves } from './engine/board'

describe('useGame', () => {
  it('opens with the standard four discs and dark to move', () => {
    const { result } = renderHook(() => useGame(BoardSize.standard))
    expect(result.current.currentPlayer).toBe(Player.dark)
    expect(result.current.counts).toEqual({ dark: 2, light: 2 })
    expect(result.current.outcome).toBeNull()
    expect(result.current.legalCells).toHaveLength(4)
  })

  it('applies a move, flips the captured disc, and hands over the turn', () => {
    const { result } = renderHook(() => useGame(BoardSize.standard))
    const move = idx(2, 3, BoardSize.standard)

    act(() => result.current.playAt(move))

    expect(result.current.currentPlayer).toBe(Player.light)
    expect(result.current.lastMove).toBe(move)
    expect(result.current.flipped).toEqual([idx(3, 3, BoardSize.standard)])
    expect(result.current.counts).toEqual({ dark: 4, light: 1 })
  })

  it('ignores an illegal move', () => {
    const { result } = renderHook(() => useGame(BoardSize.standard))
    act(() => result.current.playAt(idx(0, 0, BoardSize.standard)))
    expect(result.current.currentPlayer).toBe(Player.dark)
    expect(result.current.counts).toEqual({ dark: 2, light: 2 })
  })

  it('refuses to pass while a legal move exists', () => {
    const { result } = renderHook(() => useGame(BoardSize.standard))
    expect(result.current.mustPass).toBe(false)
    act(() => result.current.pass())
    // Nothing changed: still dark, still the opening position.
    expect(result.current.currentPlayer).toBe(Player.dark)
    expect(result.current.counts).toEqual({ dark: 2, light: 2 })
  })

  it('undo/redo restores the board and the flipped discs it recorded', () => {
    const { result } = renderHook(() => useGame(BoardSize.standard))
    const first = idx(2, 3, BoardSize.standard)
    act(() => result.current.playAt(first))
    const flippedAfterFirst = result.current.flipped
    const second = legalMoves(result.current.board, Player.light)[0]
    act(() => result.current.playAt(second))

    act(() => result.current.undo())
    expect(result.current.lastMove).toBe(first)
    expect(result.current.flipped).toEqual(flippedAfterFirst)
    expect(result.current.currentPlayer).toBe(Player.light)

    act(() => result.current.redo())
    expect(result.current.lastMove).toBe(second)
  })

  it('skips the computer’s positions when stepping through history', () => {
    // Computer holds light. After dark plays, it is light's (the computer's) turn — not a rest point.
    const { result } = renderHook(() => useGame(BoardSize.standard, Player.light))
    act(() => result.current.playAt(idx(2, 3, BoardSize.standard)))
    expect(result.current.canRedo).toBe(false) // only the computer's turn lies ahead

    // Simulate the computer's reply, then undo should land back on the opening, past the computer move.
    const reply = legalMoves(result.current.board, Player.light)[0]
    act(() => result.current.playAt(reply))
    act(() => result.current.undo())
    expect(result.current.counts).toEqual({ dark: 2, light: 2 })
    expect(result.current.currentPlayer).toBe(Player.dark)
  })

  it('plays a full game to a decided outcome, passing when a side is stuck', () => {
    const { result } = renderHook(() => useGame(BoardSize.small, null, Player.dark))
    let guard = 0
    while (result.current.outcome === null && guard++ < 200) {
      act(() => {
        if (result.current.mustPass) result.current.pass()
        else result.current.playAt(result.current.legalCells[0])
      })
    }
    expect(result.current.outcome).not.toBeNull()
    const { dark, light } = result.current.counts
    expect(dark + light).toBeLessThanOrEqual(BoardSize.small * BoardSize.small)
    const outcome = result.current.outcome!
    const expectedWinner = dark > light ? Player.dark : light > dark ? Player.light : null
    expect(outcome.winner).toBe(expectedWinner)
  })

  it('names who passed, and clears it on the next real move', () => {
    // The 8×8 first-legal-move game forces passes; each must mark the colour that had no move, and the
    // following move must clear it so the status line does not keep saying "passes" for the rest of it.
    const { result } = renderHook(() => useGame(BoardSize.standard, null, Player.dark))
    let sawPass = false
    let guard = 0
    while (result.current.outcome === null && guard++ < 200) {
      const mover = result.current.currentPlayer
      const wasPass = result.current.mustPass
      act(() => {
        if (result.current.mustPass) result.current.pass()
        else result.current.playAt(result.current.legalCells[0])
      })
      if (wasPass) {
        expect(result.current.skipped).toBe(mover)
        sawPass = true
      } else {
        expect(result.current.skipped).toBeNull()
      }
    }
    expect(sawPass).toBe(true)
  })

  it('caps history at MAX_HISTORY and stays coherent past it', () => {
    // Leaning on New game must not grow history unbounded or leave the cursor pointing off the array —
    // `current` would be undefined and every render would throw.
    const { result } = renderHook(() => useGame(BoardSize.standard))
    act(() => {
      for (let i = 0; i < MAX_HISTORY + 50; i++)
        result.current.newGame(Player.dark, BoardSize.standard)
    })
    expect(result.current.counts).toEqual({ dark: 2, light: 2 })
    expect(result.current.canUndo).toBe(true)
    act(() => result.current.undo())
    expect(result.current.counts).toEqual({ dark: 2, light: 2 })
  })

  it('resetGame starts fresh with nothing to undo into', () => {
    const { result } = renderHook(() => useGame(BoardSize.standard))
    act(() => result.current.playAt(idx(2, 3, BoardSize.standard)))
    act(() => result.current.resetGame(Player.dark, BoardSize.large))
    expect(result.current.board.size).toBe(BoardSize.large)
    expect(result.current.counts).toEqual({ dark: 2, light: 2 })
    expect(result.current.canUndo).toBe(false)
  })

  it('starts a new game, optionally at a different size', () => {
    const { result } = renderHook(() => useGame(BoardSize.standard))
    act(() => result.current.playAt(idx(2, 3, BoardSize.standard)))
    act(() => result.current.newGame(Player.dark, BoardSize.large))
    expect(result.current.board.size).toBe(BoardSize.large)
    expect(result.current.counts).toEqual({ dark: 2, light: 2 })
    expect(result.current.currentPlayer).toBe(Player.dark)
  })
})
