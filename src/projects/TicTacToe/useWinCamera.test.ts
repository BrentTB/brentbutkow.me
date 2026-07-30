import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useWinCamera } from './useWinCamera'
import { BOARD_SIZE, cellIndex } from './engine/lines'
import { Player, WinLine } from './tic-tac-toe.types'

const lineAlong = (step: [number, number, number]): WinLine => ({
  player: Player.one,
  cells: Array.from({ length: BOARD_SIZE }, (_, i) =>
    cellIndex(i * step[0], i * step[1], i * step[2])
  ),
})

describe('useWinCamera', () => {
  it('does nothing while the game is still going', () => {
    const faceLine = vi.fn()
    renderHook(() => useWinCamera(null, faceLine))
    expect(faceLine).not.toHaveBeenCalled()
  })

  it('faces the line once when it is won', () => {
    const faceLine = vi.fn()
    const win = lineAlong([1, 0, 0])
    const { rerender } = renderHook(({ w }) => useWinCamera(w, faceLine), {
      initialProps: { w: null as WinLine | null },
    })
    expect(faceLine).not.toHaveBeenCalled()

    rerender({ w: win })
    expect(faceLine).toHaveBeenCalledTimes(1)
  })

  /**
   * Guards the mode-switch regression: `faceLine` changes identity with the view mode, and keying the
   * swing on the callback re-aimed the camera on every mode change, overriding that mode's own angle.
   */
  it('does not re-aim when only the callback identity changes', () => {
    const win = lineAlong([1, 0, 0])
    const { rerender } = renderHook(({ fn }) => useWinCamera(win, fn), {
      initialProps: { fn: vi.fn() },
    })

    const second = vi.fn()
    rerender({ fn: second })
    const third = vi.fn()
    rerender({ fn: third })

    expect(second).not.toHaveBeenCalled()
    expect(third).not.toHaveBeenCalled()
  })

  it('faces a different line when a later game is won', () => {
    const faceLine = vi.fn()
    const { rerender } = renderHook(({ w }) => useWinCamera(w, faceLine), {
      initialProps: { w: lineAlong([1, 0, 0]) as WinLine | null },
    })
    expect(faceLine).toHaveBeenCalledTimes(1)

    rerender({ w: null })
    rerender({ w: lineAlong([0, 0, 1]) })
    expect(faceLine).toHaveBeenCalledTimes(2)
  })

  it('faces the same line again after it is cleared and won afresh', () => {
    const faceLine = vi.fn()
    const win = lineAlong([1, 1, 1])
    const { rerender } = renderHook(({ w }) => useWinCamera(w, faceLine), {
      initialProps: { w: win as WinLine | null },
    })
    expect(faceLine).toHaveBeenCalledTimes(1)

    rerender({ w: null })
    rerender({ w: win })
    expect(faceLine).toHaveBeenCalledTimes(2)
  })

  it('passes the two ends of the line, so the caller can read its direction', () => {
    const faceLine = vi.fn()
    renderHook(() => useWinCamera(lineAlong([1, 0, 0]), faceLine))

    const [from, to] = faceLine.mock.calls[0]
    expect(to.x).toBeGreaterThan(from.x)
    expect(to.y).toBeCloseTo(from.y)
    expect(to.z).toBeCloseTo(from.z)
  })
})
