import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { THINKING_TIME_MS, useComputerTurn } from './useComputerTurn'
import { Board, BoardSize, Difficulty, Player } from './othello.types'
import { createBoard, legalMoves } from './engine/board'
import { seededRng } from '../../utils/rng'

type Props = Parameters<typeof useComputerTurn>[0]
type SpiedProps = Omit<Props, 'play' | 'pass'> & {
  play: Mock<(cell: number) => void>
  pass: Mock<() => void>
}

const base = (overrides: Partial<Omit<Props, 'play' | 'pass'>> = {}): SpiedProps => ({
  board: createBoard(BoardSize.standard),
  computer: Player.light as Player | null,
  currentPlayer: Player.light as Player,
  difficulty: Difficulty.beginner as Difficulty,
  finished: false,
  rng: seededRng(1),
  ...overrides,
  play: vi.fn<(cell: number) => void>(),
  pass: vi.fn<() => void>(),
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

  /**
   * The search is gated behind real animation frames, not a bare timeout, so the player's capturing
   * move (and its flip cascade) paints before the hard tier's synchronous search seizes the thread.
   * Without the gate this requests no frame and would freeze the flip mid-turn.
   */
  it('waits for animation frames before searching, and cancels them on unmount', () => {
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame')
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame')
    const props = base()
    const { unmount } = renderHook(() => useComputerTurn(props))

    expect(rafSpy).toHaveBeenCalled()
    expect(props.play).not.toHaveBeenCalled()

    unmount()
    expect(cancelSpy).toHaveBeenCalled()

    rafSpy.mockRestore()
    cancelSpy.mockRestore()
  })

  it('picks a legal cell', () => {
    const props = base()
    renderHook(() => useComputerTurn(props))
    act(() => vi.advanceTimersByTime(THINKING_TIME_MS))
    expect(legalMoves(props.board, Player.light)).toContain(props.play.mock.calls[0][0])
  })

  it('stays out of it when the other colour is to move', () => {
    const props = base({ currentPlayer: Player.dark })
    renderHook(() => useComputerTurn(props))
    act(() => vi.advanceTimersByTime(THINKING_TIME_MS * 3))
    expect(props.play).not.toHaveBeenCalled()
    expect(props.pass).not.toHaveBeenCalled()
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

  it('passes instead of playing when it has no legal move', () => {
    // A board with only the computer's own discs: light flanks nothing, so it must pass.
    const size = BoardSize.small
    const board: Board = { cells: new Array(size * size).fill(Player.dark), size }
    // Leave one empty cell so the board is not "over" by fullness — light still has no flank.
    const cells = [...board.cells]
    cells[0] = null
    const props = base({ board: { cells, size } })
    renderHook(() => useComputerTurn(props))
    act(() => vi.advanceTimersByTime(THINKING_TIME_MS))
    expect(props.play).not.toHaveBeenCalled()
    expect(props.pass).toHaveBeenCalledTimes(1)
  })

  it('reports thinking while it deliberates, then stops once it plays', () => {
    const props = base()
    const { result } = renderHook(() => useComputerTurn(props))
    expect(result.current.isThinking).toBe(true)
    act(() => vi.advanceTimersByTime(THINKING_TIME_MS))
    expect(result.current.isThinking).toBe(false)
  })

  it('stops thinking when the turn passes back mid-think (an undo)', () => {
    // Undoing the human's move mid-deliberation hands the turn back before the computer replies. The
    // board must not stay locked with "thinking" on screen.
    const props = base()
    const { result, rerender } = renderHook((p: SpiedProps) => useComputerTurn(p), {
      initialProps: props,
    })
    expect(result.current.isThinking).toBe(true)
    act(() => vi.advanceTimersByTime(THINKING_TIME_MS / 2))
    act(() => rerender({ ...props, currentPlayer: Player.dark }))
    expect(result.current.isThinking).toBe(false)
    act(() => vi.advanceTimersByTime(THINKING_TIME_MS))
    expect(props.play).not.toHaveBeenCalled()
  })

  it('cancels the pending move on unmount', () => {
    const props = base()
    const { unmount } = renderHook(() => useComputerTurn(props))
    act(() => vi.advanceTimersByTime(THINKING_TIME_MS / 2))
    unmount()
    act(() => vi.advanceTimersByTime(THINKING_TIME_MS * 2))
    expect(props.play).not.toHaveBeenCalled()
  })
})
