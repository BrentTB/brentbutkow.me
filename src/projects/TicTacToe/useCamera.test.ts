import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useCamera } from './useCamera'
import { DRAG_THRESHOLD_PX, PITCH_LIMIT, VIEW_LAYOUTS, ZOOM_RANGE } from './engine/geometry'
import { ViewMode } from './tic-tac-toe.types'

const at = (x: number, y: number, pointerId = 1) => ({ pointerId, x, y })

describe('useCamera', () => {
  it('starts at the mode default', () => {
    const { result } = renderHook(() => useCamera(ViewMode.orbit))
    expect(result.current.camera).toEqual({
      yaw: VIEW_LAYOUTS[ViewMode.orbit].yaw,
      pitch: VIEW_LAYOUTS[ViewMode.orbit].pitch,
      zoom: 1,
    })
  })

  it('returns to the new mode default when the view changes', () => {
    const { result, rerender } = renderHook(({ mode }) => useCamera(mode), {
      initialProps: { mode: ViewMode.orbit as ViewMode },
    })

    act(() => {
      result.current.beginPointer(at(0, 0))
      result.current.movePointer(at(120, 0))
      result.current.endPointer(1)
    })
    expect(result.current.camera.yaw).not.toBe(VIEW_LAYOUTS[ViewMode.orbit].yaw)

    rerender({ mode: ViewMode.fanned })
    expect(result.current.camera).toEqual({
      yaw: VIEW_LAYOUTS[ViewMode.fanned].yaw,
      pitch: VIEW_LAYOUTS[ViewMode.fanned].pitch,
      zoom: 1,
    })
  })

  describe('drag versus tap', () => {
    it('leaves the camera alone and reports no drag for a press under the threshold', () => {
      const { result } = renderHook(() => useCamera(ViewMode.orbit))
      const before = result.current.camera

      act(() => {
        result.current.beginPointer(at(100, 100))
        result.current.movePointer(at(100 + DRAG_THRESHOLD_PX - 2, 100))
        result.current.endPointer(1)
      })

      expect(result.current.camera).toEqual(before)
      expect(result.current.consumedDrag()).toBe(false)
    })

    it('turns the camera and reports a drag once the threshold is passed', () => {
      const { result } = renderHook(() => useCamera(ViewMode.orbit))
      const before = result.current.camera

      act(() => {
        result.current.beginPointer(at(100, 100))
        result.current.movePointer(at(100 + DRAG_THRESHOLD_PX + 40, 100))
      })

      expect(result.current.camera.yaw).not.toBe(before.yaw)
      expect(result.current.consumedDrag()).toBe(true)
      act(() => result.current.endPointer(1))
    })

    it('accumulates a slow drag instead of losing the sub-threshold movement', () => {
      const { result } = renderHook(() => useCamera(ViewMode.orbit))
      const before = result.current.camera.yaw

      act(() => result.current.beginPointer(at(0, 0)))
      // Several nudges, each under the threshold, adding up to well past it.
      for (let step = 1; step <= 6; step++) {
        act(() => result.current.movePointer(at(step * 3, 0)))
      }

      expect(result.current.consumedDrag()).toBe(true)
      expect(result.current.camera.yaw).toBeGreaterThan(before)
    })

    /**
     * The flag only clears on the next press, so a drag followed by a keyboard activation would leave
     * it stale and swallow the Enter. Reaching a cell by keyboard is never a drag.
     */
    it('never treats a keyboard activation as a drag, even right after one', () => {
      const { result } = renderHook(() => useCamera(ViewMode.orbit))

      act(() => {
        result.current.beginPointer(at(0, 0))
        result.current.movePointer(at(90, 0))
        result.current.endPointer(1)
      })

      expect(result.current.consumedDrag()).toBe(true)
      expect(result.current.consumedDrag(true)).toBe(false)
    })

    it('clears the drag flag when the next press begins', () => {
      const { result } = renderHook(() => useCamera(ViewMode.orbit))

      act(() => {
        result.current.beginPointer(at(0, 0))
        result.current.movePointer(at(80, 0))
        result.current.endPointer(1)
      })
      expect(result.current.consumedDrag()).toBe(true)

      act(() => result.current.beginPointer(at(0, 0)))
      expect(result.current.consumedDrag()).toBe(false)
    })
  })

  describe('drag direction', () => {
    /** Dragging down tips the board down with the finger, so the pitch decreases. */
    it('lowers the pitch when dragged down and raises it when dragged up', () => {
      const { result } = renderHook(() => useCamera(ViewMode.orbit))
      const start = result.current.camera.pitch

      act(() => {
        result.current.beginPointer(at(200, 200))
        result.current.movePointer(at(200, 260))
      })
      const afterDown = result.current.camera.pitch
      expect(afterDown).toBeLessThan(start)

      act(() => result.current.movePointer(at(200, 140)))
      expect(result.current.camera.pitch).toBeGreaterThan(afterDown)
      act(() => result.current.endPointer(1))
    })

    it('turns the yaw the same way as a sideways drag', () => {
      const { result } = renderHook(() => useCamera(ViewMode.orbit))
      const start = result.current.camera.yaw

      act(() => {
        result.current.beginPointer(at(0, 0))
        result.current.movePointer(at(90, 0))
      })
      expect(result.current.camera.yaw).toBeGreaterThan(start)
      act(() => result.current.endPointer(1))
    })
  })

  describe('limits', () => {
    it('reaches both pitch extremes, so the underside and the top are equally available', () => {
      const { result } = renderHook(() => useCamera(ViewMode.orbit))

      act(() => result.current.beginPointer(at(0, 0)))
      for (let step = 1; step <= 40; step++) act(() => result.current.movePointer(at(0, step * 60)))
      expect(result.current.camera.pitch).toBe(-PITCH_LIMIT)

      for (let step = 1; step <= 80; step++) {
        act(() => result.current.movePointer(at(0, 40 * 60 - step * 60)))
      }
      expect(result.current.camera.pitch).toBe(PITCH_LIMIT)
      act(() => result.current.endPointer(1))
    })

    /** The wheel belongs to the page, so scrolling past the board keeps working. */
    it('listens for no wheel events', () => {
      const listen = vi.spyOn(window, 'addEventListener')
      renderHook(() => useCamera(ViewMode.orbit))

      expect(listen.mock.calls.map(([type]) => type)).not.toContain('wheel')
      listen.mockRestore()
    })

    /** Turning has no limit, so the angle is folded back into one turn instead of growing forever. */
    it('keeps the yaw inside a single turn however far the board is dragged', () => {
      const { result } = renderHook(() => useCamera(ViewMode.orbit))

      act(() => result.current.beginPointer(at(0, 0)))
      for (let step = 1; step <= 40; step++) {
        act(() => result.current.movePointer(at(step * 300, 0)))
      }

      expect(result.current.camera.yaw).toBeGreaterThan(-180)
      expect(result.current.camera.yaw).toBeLessThanOrEqual(180)
      act(() => result.current.endPointer(1))
    })

    it('clamps a pinch at both ends of the zoom range', () => {
      const { result } = renderHook(() => useCamera(ViewMode.orbit))

      act(() => {
        result.current.beginPointer(at(100, 100, 1))
        result.current.beginPointer(at(120, 100, 2))
      })
      act(() => result.current.movePointer(at(4000, 100, 2)))
      expect(result.current.camera.zoom).toBe(ZOOM_RANGE.max)

      act(() => result.current.movePointer(at(101, 100, 2)))
      expect(result.current.camera.zoom).toBe(ZOOM_RANGE.min)
      act(() => {
        result.current.endPointer(1)
        result.current.endPointer(2)
      })
    })
  })

  describe('pinch', () => {
    it('zooms on the change in distance between two pointers', () => {
      const { result } = renderHook(() => useCamera(ViewMode.orbit))

      act(() => {
        result.current.beginPointer(at(100, 100, 1))
        result.current.beginPointer(at(200, 100, 2))
      })
      act(() => result.current.movePointer(at(300, 100, 2)))

      expect(result.current.camera.zoom).toBeCloseTo(2)
      act(() => {
        result.current.endPointer(1)
        result.current.endPointer(2)
      })
    })

    /**
     * Regression: lifting one of three fingers leaves two down, but the baseline was measured between a
     * different pair. Read against that stale distance, the next move snapped the zoom to a new value
     * with nobody having moved a finger.
     */
    it('re-measures when a third finger lifts and leaves a different pair', () => {
      const { result } = renderHook(() => useCamera(ViewMode.orbit))

      act(() => {
        result.current.beginPointer(at(100, 100, 1))
        result.current.beginPointer(at(200, 100, 2))
        result.current.beginPointer(at(400, 100, 3))
      })
      const beforeLift = result.current.camera.zoom

      // Pointer 1 goes; 2 and 3 are 200 apart, against a 1-to-2 baseline of 100.
      act(() => result.current.endPointer(1))
      act(() => result.current.movePointer(at(400, 100, 3)))

      expect(result.current.camera.zoom).toBeCloseTo(beforeLift)
      act(() => {
        result.current.endPointer(2)
        result.current.endPointer(3)
      })
    })
  })

  describe('fanned mode', () => {
    it('does not orbit, pinch, or zoom', () => {
      const { result } = renderHook(() => useCamera(ViewMode.fanned))
      const before = result.current.camera

      act(() => {
        result.current.beginPointer(at(0, 0))
        result.current.movePointer(at(200, 200))
        result.current.endPointer(1)
      })

      expect(result.current.orbitable).toBe(false)
      expect(result.current.camera).toEqual(before)
      expect(result.current.consumedDrag()).toBe(false)
    })

    it('leaves the fixed view untouched when asked to face a line', () => {
      const { result } = renderHook(() => useCamera(ViewMode.fanned))
      const before = result.current.camera

      act(() => result.current.faceLine({ x: 0, y: 0, z: 0 }, { x: 100, y: 0, z: 100 }))
      expect(result.current.camera).toEqual(before)
    })
  })

  describe('faceLine', () => {
    it('turns the board so the line runs across the view', () => {
      const { result } = renderHook(() => useCamera(ViewMode.orbit))

      act(() => result.current.faceLine({ x: -100, y: 0, z: -100 }, { x: 100, y: 0, z: 100 }))
      expect(result.current.camera.yaw).toBeCloseTo(45)
    })
  })
})
