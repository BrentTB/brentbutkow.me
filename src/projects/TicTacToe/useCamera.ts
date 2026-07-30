import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, ViewMode } from './tic-tac-toe.types'
import {
  DRAG_THRESHOLD_PX,
  VIEW_LAYOUTS,
  clampPitch,
  clampZoom,
  snapCamera,
  yawToFace,
} from './engine/geometry'
import { Vec3 } from './tic-tac-toe.types'

/** Degrees of camera movement per pixel dragged. */
const YAW_PER_PX = 0.42
const PITCH_PER_PX = 0.32

/** One notch of the wheel. */
const ZOOM_STEP = 1.075

/** A pointer position, in the units the caller already has. Keeps the hook free of DOM event types. */
export type PointerSample = {
  pointerId: number
  x: number
  y: number
}

const cameraForMode = (mode: ViewMode): Camera => ({
  yaw: VIEW_LAYOUTS[mode].yaw,
  pitch: VIEW_LAYOUTS[mode].pitch,
  zoom: 1,
})

/**
 * Orbiting, pinching, and zooming the board.
 *
 * Dragging past a small threshold marks the gesture as a drag, which the board checks before turning
 * a release into a move — otherwise every rotation would drop a bead where the finger landed.
 */
export function useCamera(mode: ViewMode) {
  const [camera, setCamera] = useState<Camera>(() => cameraForMode(mode))
  const [isDragging, setIsDragging] = useState(false)

  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ distance: number; zoom: number } | null>(null)
  const draggedRef = useRef(false)

  const orbitable = VIEW_LAYOUTS[mode].orbitable

  // Each mode has its own vantage point; switching goes back to it rather than keeping a stale angle.
  useEffect(() => {
    setCamera(cameraForMode(mode))
    pointers.current.clear()
    pinch.current = null
    draggedRef.current = false
    setIsDragging(false)
  }, [mode])

  const move = useCallback((next: Partial<Camera>) => {
    setCamera((current) => ({
      yaw: next.yaw ?? current.yaw,
      pitch: clampPitch(next.pitch ?? current.pitch),
      zoom: clampZoom(next.zoom ?? current.zoom),
    }))
  }, [])

  const beginPointer = useCallback(
    (sample: PointerSample) => {
      if (!orbitable) return
      pointers.current.set(sample.pointerId, { x: sample.x, y: sample.y })

      if (pointers.current.size === 1) {
        draggedRef.current = false
        return
      }
      if (pointers.current.size === 2) {
        const [first, second] = [...pointers.current.values()]
        pinch.current = {
          distance: Math.hypot(first.x - second.x, first.y - second.y),
          zoom: camera.zoom,
        }
      }
    },
    [camera.zoom, orbitable]
  )

  const movePointer = useCallback(
    (sample: PointerSample) => {
      if (!orbitable) return
      const previous = pointers.current.get(sample.pointerId)
      if (!previous) return
      pointers.current.set(sample.pointerId, { x: sample.x, y: sample.y })

      if (pointers.current.size >= 2 && pinch.current) {
        const [first, second] = [...pointers.current.values()]
        const distance = Math.hypot(first.x - second.x, first.y - second.y)
        if (distance > 0) {
          move({ zoom: pinch.current.zoom * (distance / pinch.current.distance) })
        }
        draggedRef.current = true
        setIsDragging(true)
        return
      }

      const dx = sample.x - previous.x
      const dy = sample.y - previous.y
      if (!draggedRef.current && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) {
        // Still within the threshold: put the origin back so a slow drag accumulates properly.
        pointers.current.set(sample.pointerId, previous)
        return
      }

      draggedRef.current = true
      setIsDragging(true)
      // Drag down and the board tips down with your finger, as if you had hold of the front face.
      move({
        yaw: camera.yaw + dx * YAW_PER_PX,
        pitch: camera.pitch - dy * PITCH_PER_PX,
      })
    },
    [camera.pitch, camera.yaw, move, orbitable]
  )

  const endPointer = useCallback((pointerId: number) => {
    pointers.current.delete(pointerId)
    if (pointers.current.size < 2) pinch.current = null
    if (pointers.current.size === 0) setIsDragging(false)
  }, [])

  const zoomBy = useCallback(
    (direction: number) => {
      if (!orbitable) return
      move({ zoom: camera.zoom * (direction > 0 ? 1 / ZOOM_STEP : ZOOM_STEP) })
    },
    [camera.zoom, move, orbitable]
  )

  const snap = useCallback(() => setCamera((current) => snapCamera(current)), [])

  /** Turns the board so a finished line reads at its widest. */
  const faceLine = useCallback(
    (from: Vec3, to: Vec3) => {
      if (!orbitable) return
      setCamera((current) => ({ ...current, yaw: yawToFace(from, to, current.yaw) }))
    },
    [orbitable]
  )

  /** Whether the gesture that just ended was a drag, and so should not place a bead. */
  const consumedDrag = useCallback(() => draggedRef.current, [])

  return {
    camera,
    isDragging,
    orbitable,
    beginPointer,
    movePointer,
    endPointer,
    zoomBy,
    snap,
    faceLine,
    consumedDrag,
  }
}
