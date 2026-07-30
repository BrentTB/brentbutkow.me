import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
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

    it('clamps zoom at both ends of the wheel', () => {
      const { result } = renderHook(() => useCamera(ViewMode.orbit))

      for (let step = 0; step < 60; step++) act(() => result.current.zoomBy(-1))
      expect(result.current.camera.zoom).toBe(ZOOM_RANGE.max)

      for (let step = 0; step < 120; step++) act(() => result.current.zoomBy(1))
      expect(result.current.camera.zoom).toBe(ZOOM_RANGE.min)
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
  })

  describe('fanned mode', () => {
    it('does not orbit, pinch, or zoom', () => {
      const { result } = renderHook(() => useCamera(ViewMode.fanned))
      const before = result.current.camera

      act(() => {
        result.current.beginPointer(at(0, 0))
        result.current.movePointer(at(200, 200))
        result.current.endPointer(1)
        result.current.zoomBy(-1)
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

  describe('snap', () => {
    it('tidies the camera to whole steps', () => {
      const { result } = renderHook(() => useCamera(ViewMode.orbit))

      act(() => {
        result.current.beginPointer(at(0, 0))
        result.current.movePointer(at(53, 17))
        result.current.endPointer(1)
      })
      act(() => result.current.snap())

      expect(result.current.camera.yaw % 45).toBe(0)
      expect(result.current.camera.pitch % 15).toBe(0)
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
