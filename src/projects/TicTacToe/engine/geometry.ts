import { Camera, Coord, Vec3, ViewMode } from '../tic-tac-toe.types'
import { BOARD_SIZE } from './lines'

/**
 * The board's screen geometry. Everything here works in units of `spacing` (the gap between two
 * neighbouring lattice sites) so the same numbers hold at any size, and it all follows the CSS
 * convention: +x right, +y DOWN, +z toward the viewer.
 */

const toRadians = (degrees: number) => (degrees * Math.PI) / 180

/** Diameter of a placed bead, as a fraction of the spacing. */
export const BEAD_RATIO = 0.62

/** Diameter of an empty lattice marker. Small on purpose: 64 at bead weight is unreadable. */
export const EMPTY_MARKER_RATIO = 0.13

/**
 * Width of a cell's click target. Must stay below the on-screen gap between neighbouring sites, or
 * the near row's targets blanket the row behind it and those cells cannot be clicked at all.
 */
export const CELL_HIT_RATIO = 0.68

/** How far a pointer may travel before a press counts as a drag rather than a move. */
export const DRAG_THRESHOLD_PX = 7

/** Stops short of 90°, where the plates would be edge-on and the board unreadable. */
export const PITCH_LIMIT = 86

export const ZOOM_RANGE = { min: 0.55, max: 2.1 } as const

/** Faintest a bead at the back of the cube gets. Depth fog is what makes a see-through cube legible. */
export const FOG_FLOOR = 0.26

/** Below this the rail's labels would collide, so it gives up tracking and spaces them evenly. */
export const RAIL_MIN_SPACING_PX = 30

export type ViewLayout = {
  /** Default camera angles for the mode. */
  yaw: number
  pitch: number
  /** Vertical gap between layers, in spacings. */
  gap: number
  /** Sideways offset per layer, in spacings. Fans the plates out like a deck. */
  fan: number
  /** CSS perspective. Fanned is near-orthographic so its plates stay even. */
  perspective: number
  /** How many spacings of width and height the arrangement needs. */
  widthUnits: number
  heightUnits: number
  minSpacing: number
  /** Whether the camera can be dragged in this mode. */
  orbitable: boolean
}

export const VIEW_LAYOUTS: Record<ViewMode, ViewLayout> = {
  [ViewMode.orbit]: {
    yaw: 34,
    pitch: 16,
    gap: 1.2,
    fan: 0,
    perspective: 1500,
    /* Widest at a 45° yaw, where the cube presents its diagonal: 4·(cos+sin) plus a bead. Vertically it
       only ever needs 3·gap·cos(pitch) + 4·sin(pitch), which peaks around 5.2 rather than the full 7. */
    widthUnits: 6.2,
    heightUnits: 5.4,
    minSpacing: 34,
    orbitable: true,
  },
  [ViewMode.fanned]: {
    // Yaw stays at 0 so the plates read as axis-aligned rectangles, which is the point of the mode.
    yaw: 0,
    pitch: 34,
    gap: 3.6,
    fan: 0.62,
    perspective: 9000,
    widthUnits: 6.4,
    heightUnits: 11.7,
    minSpacing: 24,
    orbitable: false,
  },
}

/**
 * The smallest layer gap that keeps a fanned deck readable. A plate is `4·sin(pitch)` spacings tall
 * on screen and layers sit `gap·cos(pitch)` apart, so the plates only separate while
 * `gap > 4·tan(pitch)`; a bead's diameter on top of that stops edge beads straddling two plates.
 */
export function minFanGap(pitch: number, beadRatio = BEAD_RATIO): number {
  const radians = toRadians(pitch)
  return 4 * Math.tan(radians) + beadRatio / Math.cos(radians)
}

/** On-screen gap between neighbouring columns, in spacings. The tightest gap a click target faces. */
export function columnScreenSpacing(yaw: number): number {
  return Math.abs(Math.cos(toRadians(yaw)))
}

/** Pixels per lattice step, chosen so the whole arrangement fits the stage. */
export function spacingFor(mode: ViewMode, width: number, height: number): number {
  const layout = VIEW_LAYOUTS[mode]
  return Math.max(
    layout.minSpacing,
    Math.min(width / layout.widthUnits, height / layout.heightUnits)
  )
}

/** Where a lattice site sits in board space. Layer 1 is the bottom, so higher layers go up (−y). */
export function cellPosition(coord: Coord, mode: ViewMode, spacing: number): Vec3 {
  const layout = VIEW_LAYOUTS[mode]
  const middle = (BOARD_SIZE - 1) / 2
  return {
    x: (coord.x - middle) * spacing + (coord.layer - middle) * layout.fan * spacing,
    y: -(coord.layer - middle) * spacing * layout.gap,
    z: (coord.y - middle) * spacing,
  }
}

/** The centre of a layer's plate. */
export function plateCenter(layer: number, mode: ViewMode, spacing: number): Vec3 {
  return cellPosition({ x: (BOARD_SIZE - 1) / 2, y: (BOARD_SIZE - 1) / 2, layer }, mode, spacing)
}

/**
 * A point after the camera turns, matching CSS's `rotateX(pitch) rotateY(yaw)`: yaw first, then
 * pitch. The resulting z is depth, larger meaning nearer the viewer.
 */
export function rotateForCamera(point: Vec3, yaw: number, pitch: number): Vec3 {
  const a = toRadians(yaw)
  const b = toRadians(pitch)
  const xa = point.x * Math.cos(a) + point.z * Math.sin(a)
  const za = -point.x * Math.sin(a) + point.z * Math.cos(a)
  return {
    x: xa,
    y: point.y * Math.cos(b) - za * Math.sin(b),
    z: point.y * Math.sin(b) + za * Math.cos(b),
  }
}

/** Opacity for a bead at `depth`, given the depth range of the whole board. */
export function fogFor(depth: number, nearest: number, furthest: number): number {
  const span = nearest - furthest
  if (span <= 0) return 1
  const t = (depth - furthest) / span
  return FOG_FLOOR + (1 - FOG_FLOOR) * t
}

export function clampPitch(pitch: number): number {
  return Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch))
}

export function clampZoom(zoom: number): number {
  return Math.max(ZOOM_RANGE.min, Math.min(ZOOM_RANGE.max, zoom))
}

/** Tidies the camera to whole steps: 45° of yaw, 15° of pitch. */
export function snapCamera(camera: Camera): Camera {
  return {
    ...camera,
    yaw: Math.round(camera.yaw / 45) * 45,
    pitch: clampPitch(Math.round(camera.pitch / 15) * 15),
  }
}

/**
 * Vertical screen offsets for each layer, for placing controls level with their plate. A plate centre
 * at board height y lands at `zoom·y·cos(pitch) / (1 − y·sin(pitch)/perspective)`: the perspective
 * divide is what spreads the lower plates further apart than the upper ones, so anything tracking
 * them has to include it too. Near a top-down pitch the stack collapses, so fall back to even spacing.
 */
export function layerScreenOffsets(mode: ViewMode, spacing: number, camera: Camera): number[] {
  const layout = VIEW_LAYOUTS[mode]
  const radians = toRadians(camera.pitch)

  const offsets = Array.from({ length: BOARD_SIZE }, (_, layer) => {
    const y = plateCenter(layer, mode, spacing).y
    return (
      (camera.zoom * y * Math.cos(radians)) / (1 - (y * Math.sin(radians)) / layout.perspective)
    )
  })

  const tightest = Math.min(
    ...offsets.slice(1).map((offset, index) => Math.abs(offset - offsets[index]))
  )
  if (tightest >= RAIL_MIN_SPACING_PX) return offsets

  const middle = (BOARD_SIZE - 1) / 2
  return offsets.map((_, layer) => -(layer - middle) * RAIL_MIN_SPACING_PX)
}

export type WinBarTransform = {
  /** Length of the bar, before the small overhang past the end beads. */
  length: number
  midpoint: Vec3
  axisX: number
  axisZ: number
  angle: number
}

/**
 * Places a bar along a winning line. A bar's own long axis is +y, so it rotates about
 * `(0,1,0) × direction` by the angle between them. A line straight up a rod needs no rotation.
 */
export function winBarTransform(from: Vec3, to: Vec3): WinBarTransform {
  const delta = { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z }
  const length = Math.hypot(delta.x, delta.y, delta.z)
  const midpoint = {
    x: (from.x + to.x) / 2,
    y: (from.y + to.y) / 2,
    z: (from.z + to.z) / 2,
  }
  if (length === 0) return { length, midpoint, axisX: 1, axisZ: 0, angle: 0 }

  const unit = { x: delta.x / length, y: delta.y / length, z: delta.z / length }
  const axis = { x: unit.z, z: -unit.x }
  const axisLength = Math.hypot(axis.x, axis.z)
  if (axisLength < 1e-9) return { length, midpoint, axisX: 1, axisZ: 0, angle: 0 }

  return {
    length,
    midpoint,
    axisX: axis.x / axisLength,
    axisZ: axis.z / axisLength,
    angle: (Math.acos(Math.max(-1, Math.min(1, unit.y))) * 180) / Math.PI,
  }
}

/**
 * Yaw that shows a line at its widest. A direction's on-screen width is
 * `dx·cos(yaw) + dz·sin(yaw)`, widest at `atan2(dz, dx)`. A line up a rod looks the same from every
 * yaw, so the current one is kept.
 */
export function yawToFace(from: Vec3, to: Vec3, currentYaw: number): number {
  const dx = to.x - from.x
  const dz = to.z - from.z
  if (Math.hypot(dx, dz) < 1e-9) return currentYaw
  return (Math.atan2(dz, dx) * 180) / Math.PI
}
