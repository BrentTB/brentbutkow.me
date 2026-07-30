import { PointerEvent, ReactNode, RefObject, useMemo } from 'react'
import {
  Board as BoardState,
  Camera,
  Player,
  PlayerProfile,
  ViewMode,
  WinLine,
} from '../../tic-tac-toe.types'
import { cssVars } from '../../css-vars'
import { BOARD_SIZE, CELL_COUNT, cellCoord } from '../../engine/lines'
import {
  BEAD_RATIO,
  CELL_HIT_RATIO,
  EMPTY_MARKER_RATIO,
  VIEW_LAYOUTS,
  cellPosition,
  fogFor,
  plateCenter,
  rotateForCamera,
  winBarTransform,
} from '../../engine/geometry'
import { gameCopy } from '../../data'
import styles from './Board.module.scss'

interface BoardProps {
  board: BoardState
  win: WinLine | null
  /** Which layer is shown on its own, or null for all four. */
  focusedLayer: number | null
  players: Record<Player, PlayerProfile>
  mode: ViewMode
  camera: Camera
  spacing: number
  /** Sideways nudge that keeps the board clear of the layer rail. */
  shift: number
  isDragging: boolean
  stageRef: RefObject<HTMLDivElement>
  onPlay: (index: number, fromKeyboard: boolean) => void
  onPointerDown: (event: PointerEvent<HTMLDivElement>) => void
  onPointerMove: (event: PointerEvent<HTMLDivElement>) => void
  onPointerEnd: (event: PointerEvent<HTMLDivElement>) => void
  /** Overlaid controls that need to sit above the scene, such as the layer rail. */
  children?: ReactNode
}

export function Board({
  board,
  win,
  focusedLayer,
  players,
  mode,
  camera,
  spacing,
  shift,
  isDragging,
  stageRef,
  onPlay,
  onPointerDown,
  onPointerMove,
  onPointerEnd,
  children,
}: BoardProps) {
  const layout = VIEW_LAYOUTS[mode]

  const sites = useMemo(() => {
    const positions = Array.from({ length: CELL_COUNT }, (_, index) =>
      cellPosition(cellCoord(index), mode, spacing)
    )

    // Depth fog needs the range across the whole board, so the rotation happens once for all of it.
    const depths = positions.map((point) => rotateForCamera(point, camera.yaw, camera.pitch).z)
    const nearest = Math.max(...depths)
    const furthest = Math.min(...depths)

    return positions.map((position, index) => ({
      index,
      coord: cellCoord(index),
      position,
      fog: fogFor(depths[index], nearest, furthest),
    }))
  }, [camera.pitch, camera.yaw, mode, spacing])

  const winCells = useMemo(() => new Set(win?.cells ?? []), [win])

  const winBar = useMemo(() => {
    if (!win) return null
    const from = sites[win.cells[0]].position
    const to = sites[win.cells[BOARD_SIZE - 1]].position
    return winBarTransform(from, to)
  }, [sites, win])

  return (
    <div
      className={styles.stage}
      ref={stageRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      data-orbitable={layout.orbitable || undefined}
      data-dragging={isDragging || undefined}
      style={cssVars({ '--perspective': `${layout.perspective}px` })}
    >
      <div
        className={styles.cube}
        data-dragging={isDragging || undefined}
        style={cssVars({
          '--yaw': `${camera.yaw}deg`,
          '--pitch': `${camera.pitch}deg`,
          '--zoom': camera.zoom,
          '--spacing': `${spacing}px`,
          '--shift': `${shift}px`,
          '--hit-ratio': CELL_HIT_RATIO,
          '--bead-ratio': BEAD_RATIO,
          '--marker-ratio': EMPTY_MARKER_RATIO,
        })}
      >
        {Array.from({ length: BOARD_SIZE }, (_, layer) => (
          <div
            key={`plate-${layer}`}
            className={styles.plate}
            data-active={focusedLayer === layer || undefined}
            style={cssVars({
              '--plate-x': `${plateCenter(layer, mode, spacing).x}px`,
              '--plate-y': `${plateCenter(layer, mode, spacing).y}px`,
            })}
          />
        ))}

        {layout.fan === 0 &&
          Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, column) => {
            const x = column % BOARD_SIZE
            const y = Math.floor(column / BOARD_SIZE)
            const top = cellPosition({ x, y, layer: BOARD_SIZE - 1 }, mode, spacing)
            const bottom = cellPosition({ x, y, layer: 0 }, mode, spacing)
            return (
              <div
                key={`rod-${column}`}
                className={styles.rod}
                style={cssVars({
                  '--rod-x': `${top.x}px`,
                  '--rod-z': `${top.z}px`,
                  '--rod-length': `${bottom.y - top.y}px`,
                })}
              />
            )
          })}

        {sites.map(({ index, coord, position, fog }) => {
          const owner = board[index]
          const dimmed = focusedLayer !== null && coord.layer !== focusedLayer
          const label = owner
            ? gameCopy.cellTakenLabel(
                coord.layer + 1,
                coord.x + 1,
                coord.y + 1,
                players[owner].name
              )
            : gameCopy.cellLabel(coord.layer + 1, coord.x + 1, coord.y + 1)

          return (
            <button
              key={index}
              type="button"
              className={styles.cell}
              aria-label={label}
              disabled={owner !== null || win !== null}
              data-dim={dimmed || undefined}
              data-filled={owner ?? undefined}
              data-won={winCells.has(index) || undefined}
              onClick={(event) => onPlay(index, event.detail === 0)}
              style={cssVars({
                '--cell-x': `${position.x}px`,
                '--cell-y': `${position.y}px`,
                '--cell-z': `${position.z}px`,
                '--fog': fog,
                ...(owner ? { '--bead-rgb': players[owner].rgb } : {}),
              })}
            >
              <span className={styles.billboard}>
                {owner ? <span className={styles.bead} /> : <span className={styles.marker} />}
              </span>
            </button>
          )
        })}

        {win && winBar && (
          <div
            className={styles.winBar}
            style={cssVars({
              '--bead-rgb': players[win.player].rgb,
              '--bar-length': `${winBar.length}px`,
              '--bar-x': `${winBar.midpoint.x}px`,
              '--bar-y': `${winBar.midpoint.y}px`,
              '--bar-z': `${winBar.midpoint.z}px`,
              '--bar-axis-x': winBar.axisX,
              '--bar-axis-z': winBar.axisZ,
              '--bar-angle': `${winBar.angle}deg`,
            })}
          />
        )}
      </div>

      {children}
    </div>
  )
}
