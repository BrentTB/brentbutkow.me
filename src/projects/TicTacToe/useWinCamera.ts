import { useEffect, useRef } from 'react'
import { Vec3, ViewMode, WinLine } from './tic-tac-toe.types'
import { cellPosition } from './engine/geometry'
import { cellCoord } from './engine/lines'

/**
 * Swings the camera to face a line the moment it is won, and only then.
 *
 * Keyed on the line itself rather than on the callback it is given: `faceLine` changes identity with the
 * view mode, and keying on it would re-aim the camera on every mode switch, overriding that mode's own
 * starting angle.
 *
 * The line is marked as framed only once `faceLine` says it aimed. A view with no camera to turn refuses,
 * and recording that as done would leave the win unframed for good — switching to the cube resets the
 * camera, and the aim that should follow would find the line already ticked off.
 */
export function useWinCamera(win: WinLine | null, faceLine: (from: Vec3, to: Vec3) => boolean) {
  const faced = useRef<string | null>(null)

  useEffect(() => {
    if (!win) {
      faced.current = null
      return
    }

    const key = win.cells.join(',')
    if (faced.current === key) return

    // Only the line's direction matters, and that does not depend on the board's scale or mode.
    const from = cellPosition(cellCoord(win.cells[0]), ViewMode.orbit, 1)
    const to = cellPosition(cellCoord(win.cells[win.cells.length - 1]), ViewMode.orbit, 1)
    if (faceLine(from, to)) faced.current = key
  }, [faceLine, win])
}
