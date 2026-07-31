import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useWinCamera } from './useWinCamera'
import { BOARD_SIZE, cellIndex } from './engine/lines'
import { Player, Vec3, WinLine } from './tic-tac-toe.types'

const lineAlong = (step: [number, number, number]): WinLine => ({
  player: Player.one,
  cells: Array.from({ length: BOARD_SIZE }, (_, i) =>
    cellIndex(i * step[0], i * step[1], i * step[2])
  ),
})

/** A camera that turns when asked, which is what `useCamera` reports from an orbitable view. */
const aims = () => vi.fn<(from: Vec3, to: Vec3) => boolean>(() => true)

/** A view with no camera to turn: it refuses, and the line stays unframed. */
const refuses = () => vi.fn<(from: Vec3, to: Vec3) => boolean>(() => false)

describe('useWinCamera', () => {
  it('does nothing while the game is still going', () => {
    const faceLine = aims()
    renderHook(() => useWinCamera(null, faceLine))
    expect(faceLine).not.toHaveBeenCalled()
  })

  it('faces the line once when it is won', () => {
    const faceLine = aims()
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
      initialProps: { fn: aims() },
    })

    const second = aims()
    rerender({ fn: second })
    const third = aims()
    rerender({ fn: third })

    expect(second).not.toHaveBeenCalled()
    expect(third).not.toHaveBeenCalled()
  })

  it('faces a different line when a later game is won', () => {
    const faceLine = aims()
    const { rerender } = renderHook(({ w }) => useWinCamera(w, faceLine), {
      initialProps: { w: lineAlong([1, 0, 0]) as WinLine | null },
    })
    expect(faceLine).toHaveBeenCalledTimes(1)

    rerender({ w: null })
    rerender({ w: lineAlong([0, 0, 1]) })
    expect(faceLine).toHaveBeenCalledTimes(2)
  })

  it('faces the same line again after it is cleared and won afresh', () => {
    const faceLine = aims()
    const win = lineAlong([1, 1, 1])
    const { rerender } = renderHook(({ w }) => useWinCamera(w, faceLine), {
      initialProps: { w: win as WinLine | null },
    })
    expect(faceLine).toHaveBeenCalledTimes(1)

    rerender({ w: null })
    rerender({ w: win })
    expect(faceLine).toHaveBeenCalledTimes(2)
  })

  /**
   * Regression: the fanned deck has no camera to turn, so `faceLine` refuses. Marking the line as framed
   * anyway left it framed by nothing — switching to the cube resets the camera, and the aim that should
   * have followed found the line already ticked off, so a win there was never shown at its widest.
   */
  it('tries again when the view it was in refused to turn', () => {
    const win = lineAlong([1, 1, 1])
    const flat = refuses()
    const { rerender } = renderHook(({ fn }) => useWinCamera(win, fn), {
      initialProps: { fn: flat as (from: Vec3, to: Vec3) => boolean },
    })
    expect(flat).toHaveBeenCalledTimes(1)

    // Switching to the cube hands over a camera that can turn, and the win is finally faced.
    const cube = aims()
    rerender({ fn: cube })
    expect(cube).toHaveBeenCalledTimes(1)
  })

  it('stops asking once a view has actually turned', () => {
    const win = lineAlong([1, 1, 1])
    const first = aims()
    const { rerender } = renderHook(({ fn }) => useWinCamera(win, fn), {
      initialProps: { fn: first as (from: Vec3, to: Vec3) => boolean },
    })
    expect(first).toHaveBeenCalledTimes(1)

    const later = aims()
    rerender({ fn: later })
    expect(later).not.toHaveBeenCalled()
  })

  it('passes the two ends of the line, so the caller can read its direction', () => {
    const faceLine = aims()
    renderHook(() => useWinCamera(lineAlong([1, 0, 0]), faceLine))

    const [from, to] = faceLine.mock.calls[0]
    expect(to.x).toBeGreaterThan(from.x)
    expect(to.y).toBeCloseTo(from.y)
    expect(to.z).toBeCloseTo(from.z)
  })
})
