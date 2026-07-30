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
  /** Colour of whoever is to move, so the board itself shows whose turn it is. */
  turnRgb: string
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
  turnRgb,
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
      fog: layout.depthFog ? fogFor(depths[index], nearest, furthest) : 1,
    }))
  }, [camera.pitch, camera.yaw, layout.depthFog, mode, spacing])

  const winCells = useMemo(() => new Set(win?.cells ?? []), [win])

  /**
   * The rod is drawn as one length per pair of neighbouring beads, each stopping at the beads' surfaces
   * rather than running the whole line. A single bar through the middle of a bead cannot sort correctly
   * against it: half of the bar lands in front of the sphere it is supposed to be threaded through.
   */
  const winSegments = useMemo(() => {
    if (!win) return []
    const inset = spacing * BEAD_RATIO
    return win.cells.slice(1).map((cell, index) => {
      const previous = win.cells[index]
      const from = sites[previous].position
      const to = sites[cell].position
      const bar = winBarTransform(from, to)
      // A length is only shown when both of the beads it joins are, or it hangs in an empty layer.
      const bothShown =
        focusedLayer === null ||
        (sites[previous].coord.layer === focusedLayer && sites[cell].coord.layer === focusedLayer)
      return {
        key: `${previous}-${cell}`,
        bar,
        length: Math.max(0, bar.length - inset),
        dimmed: !bothShown,
      }
    })
  }, [focusedLayer, sites, spacing, win])

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
      style={cssVars({ '--perspective': `${layout.perspective}px`, '--turn-rgb': turnRgb })}
    >
      <div
        className={styles.cube}
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

        {win &&
          winSegments.map(({ key, bar, length, dimmed }) => (
            <div
              key={key}
              className={styles.winBar}
              data-dim={dimmed || undefined}
              style={cssVars({
                '--bead-rgb': players[win.player].rgb,
                '--bar-length': `${length}px`,
                '--bar-x': `${bar.midpoint.x}px`,
                '--bar-y': `${bar.midpoint.y}px`,
                '--bar-z': `${bar.midpoint.z}px`,
                '--bar-axis-x': bar.axisX,
                '--bar-axis-z': bar.axisZ,
                '--bar-angle': `${bar.angle}deg`,
              })}
            />
          ))}
      </div>

      {children}
    </div>
  )
}
