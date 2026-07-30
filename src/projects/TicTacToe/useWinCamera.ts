import { useEffect, useRef } from 'react'
import { Vec3, ViewMode, WinLine } from './tic-tac-toe.types'
import { cellPosition } from './engine/geometry'
import { cellCoord } from './engine/lines'

/**
 * Swings the camera to face a line the moment it is won, and only then.
 *
 * Keyed on the line itself rather than on the callback it is given. `faceLine` changes identity with
 * the view mode, so keying on the callback re-aimed the camera every time the mode changed while a win
 * was on screen, overriding that mode's own starting angle.
 */
export function useWinCamera(win: WinLine | null, faceLine: (from: Vec3, to: Vec3) => void) {
  const faced = useRef<string | null>(null)

  useEffect(() => {
    if (!win) {
      faced.current = null
      return
    }

    const key = win.cells.join(',')
    if (faced.current === key) return
    faced.current = key

    // Only the line's direction matters, and that does not depend on the board's scale or mode.
    const from = cellPosition(cellCoord(win.cells[0]), ViewMode.orbit, 1)
    const to = cellPosition(cellCoord(win.cells[win.cells.length - 1]), ViewMode.orbit, 1)
    faceLine(from, to)
  }, [faceLine, win])
}
