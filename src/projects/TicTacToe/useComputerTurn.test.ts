import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import {
  PAINT_DELAY_MS,
  SEARCH_BUDGET_MS,
  THINKING_TIME_MS,
  useComputerTurn,
} from './useComputerTurn'
import { applyMove, createBoard } from './engine/board'
import { cellIndex } from './engine/lines'
import { seededRng } from './engine/rng'
import { Board, Difficulty, Player } from './tic-tac-toe.types'

type Props = Parameters<typeof useComputerTurn>[0]
type SpiedProps = Omit<Props, 'play'> & { play: Mock<(cell: number) => void> }

/** `play` is always the spy, so it is set after the overrides rather than being overridable. */
const base = (overrides: Partial<Omit<Props, 'play'>> = {}): SpiedProps => ({
  board: createBoard(),
  computer: Player.two as Player | null,
  currentPlayer: Player.two as Player,
  difficulty: 'easy' as Difficulty,
  finished: false,
  rng: seededRng(1),
  ...overrides,
  play: vi.fn<(cell: number) => void>(),
})

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useComputerTurn', () => {
  it('plays after the thinking pause when it is the computer to move', () => {
    const props = base()
    renderHook(() => useComputerTurn(props))

    expect(props.play).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(THINKING_TIME_MS))
    expect(props.play).toHaveBeenCalledTimes(1)
  })

  it('reports that it is thinking until it moves', () => {
    const props = base()
    const { result } = renderHook(() => useComputerTurn(props))

    expect(result.current.isThinking).toBe(true)
    act(() => vi.advanceTimersByTime(THINKING_TIME_MS))
    expect(result.current.isThinking).toBe(false)
  })

  it('stays out of it when the other seat is to move', () => {
    const props = base({ currentPlayer: Player.one })
    const { result } = renderHook(() => useComputerTurn(props))

    act(() => vi.advanceTimersByTime(THINKING_TIME_MS * 3))
    expect(props.play).not.toHaveBeenCalled()
    expect(result.current.isThinking).toBe(false)
  })

  it('stays out of a two-player game entirely', () => {
    const props = base({ computer: null })
    renderHook(() => useComputerTurn(props))

    act(() => vi.advanceTimersByTime(THINKING_TIME_MS * 3))
    expect(props.play).not.toHaveBeenCalled()
  })

  it('does not move once the game is over', () => {
    const props = base({ finished: true })
    renderHook(() => useComputerTurn(props))

    act(() => vi.advanceTimersByTime(THINKING_TIME_MS * 3))
    expect(props.play).not.toHaveBeenCalled()
  })

  it('picks a cell that is actually free', () => {
    const board = applyMove(createBoard(), cellIndex(1, 1, 1), Player.one)
    const props = base({ board })
    renderHook(() => useComputerTurn(props))

    act(() => vi.advanceTimersByTime(THINKING_TIME_MS))
    const move = props.play.mock.calls[0][0]
    expect(board[move]).toBeNull()
  })

  it('takes a win it can see', () => {
    let board = createBoard()
    for (const x of [0, 1, 2]) board = applyMove(board, cellIndex(x, 0, 0), Player.two)
    const props = base({ board, difficulty: 'hard' })
    renderHook(() => useComputerTurn(props))

    act(() => vi.advanceTimersByTime(THINKING_TIME_MS))
    expect(props.play).toHaveBeenCalledWith(cellIndex(3, 0, 0))
  })

  /**
   * Guards the double-move: unmounting or a board change mid-think must cancel the pending reply, or an
   * undo part-way through the pause lands a move on a position that no longer exists.
   */
  it('drops a pending move when the board changes underneath it', () => {
    const props = base()
    const { rerender } = renderHook((current: typeof props) => useComputerTurn(current), {
      initialProps: props,
    })

    act(() => vi.advanceTimersByTime(THINKING_TIME_MS / 2))
    const undone: Board = applyMove(createBoard(), cellIndex(0, 0, 0), Player.one)
    rerender({ ...props, board: undone })

    act(() => vi.advanceTimersByTime(THINKING_TIME_MS))
    // Exactly one move for the new position, none left over from the old one.
    expect(props.play).toHaveBeenCalledTimes(1)
  })

  it('cancels the pending move on unmount', () => {
    const props = base()
    const { unmount } = renderHook(() => useComputerTurn(props))

    act(() => vi.advanceTimersByTime(THINKING_TIME_MS / 2))
    unmount()
    act(() => vi.advanceTimersByTime(THINKING_TIME_MS * 2))
    expect(props.play).not.toHaveBeenCalled()
  })

  it('stops thinking when the turn passes back mid-pause', () => {
    const props = base()
    const { result, rerender } = renderHook((current: typeof props) => useComputerTurn(current), {
      initialProps: props,
    })

    expect(result.current.isThinking).toBe(true)
    rerender({ ...props, currentPlayer: Player.one })
    expect(result.current.isThinking).toBe(false)

    act(() => vi.advanceTimersByTime(THINKING_TIME_MS * 2))
    expect(props.play).not.toHaveBeenCalled()
  })

  it('takes the first seat when the computer opens', () => {
    const props = base({ computer: Player.one, currentPlayer: Player.one })
    renderHook(() => useComputerTurn(props))

    act(() => vi.advanceTimersByTime(THINKING_TIME_MS))
    expect(props.play).toHaveBeenCalledTimes(1)
  })
})

describe('useComputerTurn — every difficulty takes the same time', () => {
  /**
   * Only the strongest tier needs the thinking time. The rest wait for it anyway, so no opponent gives
   * itself away by replying the instant you lift your finger.
   */
  const timeToMove = (difficulty: Difficulty) => {
    const props = base({ difficulty })
    renderHook(() => useComputerTurn(props))

    let waited = 0
    const step = 20
    while (props.play.mock.calls.length === 0 && waited <= THINKING_TIME_MS * 3) {
      act(() => vi.advanceTimersByTime(step))
      waited += step
    }
    return { waited, moved: props.play.mock.calls.length }
  }

  it('has not moved before the thinking time is up, at any difficulty', () => {
    for (const difficulty of ['easy', 'medium', 'hard'] as Difficulty[]) {
      const props = base({ difficulty })
      renderHook(() => useComputerTurn(props))

      act(() => vi.advanceTimersByTime(THINKING_TIME_MS - 50))
      expect(props.play).not.toHaveBeenCalled()
    }
  })

  it('moves once the thinking time is up, at any difficulty', () => {
    for (const difficulty of ['easy', 'medium', 'hard'] as Difficulty[]) {
      const props = base({ difficulty })
      renderHook(() => useComputerTurn(props))

      act(() => vi.advanceTimersByTime(THINKING_TIME_MS + 50))
      expect(props.play).toHaveBeenCalledTimes(1)
    }
  })

  it('takes about the same wall time whichever tier is playing', () => {
    const easy = timeToMove('easy')
    const medium = timeToMove('medium')
    expect(easy.moved).toBe(1)
    expect(medium.moved).toBe(1)
    expect(Math.abs(easy.waited - medium.waited)).toBeLessThanOrEqual(60)
  })
})

describe('the search budget fills the thinking time', () => {
  /**
   * The wait happens whatever the difficulty, so any budget short of the window is search thrown away.
   * Guards the two constants drifting apart again: they were 700 and 900, leaving 168ms doing nothing.
   */
  it('gives the search everything except the paint beat', () => {
    expect(SEARCH_BUDGET_MS).toBeGreaterThan(0)
    expect(SEARCH_BUDGET_MS).toBeLessThan(THINKING_TIME_MS)
    // Whatever the paint beat is, nothing else is left over.
    expect(THINKING_TIME_MS - SEARCH_BUDGET_MS).toBeLessThanOrEqual(50)
  })

  /**
   * The strongest tier is deliberately not driven through the hook here. Its search stops on a wall
   * clock, and fake timers freeze `Date.now`, so the deadline never arrives and it runs to its full
   * depth ceiling instead of its budget. The engine's own tests cover the budget with an injected clock.
   */
  it('gives the search every millisecond except the paint beat', () => {
    expect(SEARCH_BUDGET_MS).toBe(THINKING_TIME_MS - PAINT_DELAY_MS)
  })
})
