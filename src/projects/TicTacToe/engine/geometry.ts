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

/**
 * How wide the last move is once its ring and the ring's glow are counted, in spacings.
 *
 * The ring sits at `inset: -22%` of the bead in `Board.module.scss`, reaching 22% past it on every side,
 * and casts a soft glow beyond that. This is the widest thing the board paints, and each mode is clipped
 * to its box: measuring the overhang by the bare bead cropped the ring off the top and bottom rows.
 *
 * The glow's share is an allowance rather than a derivation, since a `box-shadow` is a fixed pixel blur
 * while everything else here scales with the spacing.
 */
export const MARKED_BEAD_RATIO = BEAD_RATIO * 1.44 + 0.4

/** How far a pointer may travel before a press counts as a drag rather than a move. */
export const DRAG_THRESHOLD_PX = 7

/** Stops short of 90°, where the plates would be edge-on and the board unreadable. */
export const PITCH_LIMIT = 86

export const ZOOM_RANGE = { min: 0.55, max: 2.1 } as const

/** Faintest a bead at the back of the cube gets. Depth fog is what makes a see-through cube legible. */
export const FOG_FLOOR = 0.26

/** Below this the rail's labels would collide, so it gives up tracking and spaces them evenly. */
export const RAIL_MIN_SPACING_PX = 30

/** Angle the fanned deck is viewed from. Steeper means each plate is taller on screen. */
const FAN_PITCH = 40

/** Visible gap between two fanned plates, as a fraction of a plate's own on-screen height. */
export const PLATE_GAP_RATIO = 0.2

/**
 * Layer gap that lands the visible space between plates at `PLATE_GAP_RATIO` of a plate's height.
 *
 * A plate is 4·sin(pitch) spacings tall on screen and layers sit gap·cos(pitch) apart, so the space
 * showing between them is gap·cos − 4·sin. Setting that to ratio·(4·sin) and solving gives the first
 * term below.
 *
 * Floored at `minFanGap`, because a bead is a fixed size while the gap is a fraction of the plate: ask
 * for a gap narrower than a bead and the beads on the front and back rows cross into the next plate's
 * band. A tighter ratio than the floor allows needs a steeper pitch, which makes the plates taller and
 * so makes the same fraction of them wider.
 */
export function fanGapFor(pitch: number, ratio = PLATE_GAP_RATIO): number {
  return Math.max(4 * Math.tan(toRadians(pitch)) * (1 + ratio), minFanGap(pitch))
}

/**
 * Spacings of height the fanned deck occupies: three layer gaps, one plate, and half of
 * `MARKED_BEAD_RATIO` of overhang at each end, since that is a full width. The overhang is measured by the
 * ringed bead because it is the widest thing the board draws and the deck is clipped to this height.
 * Derived rather than hand-tuned, so retuning the pitch or the gap cannot leave a stale figure behind and
 * reintroduce dead space.
 *
 * A plate spans the three steps between its four rows, not four of them: counting the extra step left a
 * band of empty space above the top plate, which is expensive in a mode whose whole point is height.
 */
export function fanHeightUnits(pitch: number, gap: number): number {
  const radians = toRadians(pitch)
  return 3 * gap * Math.cos(radians) + (BOARD_SIZE - 1) * Math.sin(radians) + MARKED_BEAD_RATIO
}

/**
 * How much of the worst-case extent the height budget actually books, below 1 on purpose.
 *
 * The worst case only shows up at extreme pitch: around 54° the cube needs about 6.49 spacings, while at
 * the 16° default it needs about 5.35. Budgeting for the worst case would leave more than a bead of dead
 * band above and below the cube at every angle anyone reads the board from, in a box whose height is the
 * scarce dimension. So the budget is trimmed to sit above the ordinary angles and below the extremes: drag
 * the cube to a near-vertical pitch and the outer beads crop slightly. That is the accepted trade — this
 * is not headroom, and raising it past 1 buys back the crop by paying in dead space.
 */
const ORBIT_EXTENT_TRIM = 0.9

/**
 * Spacings of height the cube is given, across the camera angles it is read from.
 *
 * The board is dragged freely, and the vertical extent depends on where it is pointed: half the stack
 * (`gap` per layer) leans by cos(pitch) while half the depth leans by sin(pitch), and the depth is widest
 * at a 45° yaw, where the cube presents its diagonal. Maximised over pitch that sum is the hypotenuse of
 * the two, which is the closed form below, trimmed by `ORBIT_EXTENT_TRIM`. Zoom is left out on purpose:
 * pinched in past 1×, the scene is meant to run past its box.
 */
export function orbitHeightUnits(gap: number, overhang = MARKED_BEAD_RATIO): number {
  const half = (BOARD_SIZE - 1) / 2
  return 2 * Math.hypot(half * gap, half * Math.SQRT2) * ORBIT_EXTENT_TRIM + overhang
}

const FAN_GAP = fanGapFor(FAN_PITCH)

/** Layer gap in the cube, in spacings. Wide enough that the four plates read as separate heights. */
const ORBIT_GAP = 1

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
  /**
   * Downward nudge in spacings that centres the projected scene in its box.
   *
   * A tilted scene under perspective does not project symmetrically about the box's middle, so without
   * this the arrangement sits off centre and one edge clips while the other keeps a dead band. Measured
   * against the rendered board in each mode.
   */
  lift: number
  minSpacing: number
  /** Whether the camera can be dragged in this mode. */
  orbitable: boolean
  /** Whether beads fade with depth. Only worth it where they hide behind each other. */
  depthFog: boolean
}

export const VIEW_LAYOUTS: Record<ViewMode, ViewLayout> = {
  [ViewMode.orbit]: {
    yaw: 34,
    pitch: 16,
    gap: ORBIT_GAP,
    fan: 0,
    perspective: 1500,
    /* Widest at a 45° yaw, where the cube presents its diagonal: 4·(cos+sin) plus a bead. Height covers
       the angles the board is read from rather than the default camera alone, since a budget fitted to
       the default clipped beads as soon as the cube was turned. */
    widthUnits: 6.2,
    heightUnits: orbitHeightUnits(ORBIT_GAP),
    lift: 0,
    minSpacing: 34,
    orbitable: true,
    depthFog: true,
  },
  [ViewMode.fanned]: {
    // Yaw stays at 0 so the plates read as axis-aligned rectangles, which is the point of the mode.
    yaw: 0,
    pitch: FAN_PITCH,
    gap: FAN_GAP,
    fan: 0.62,
    perspective: 9000,
    widthUnits: 6.5,
    heightUnits: fanHeightUnits(FAN_PITCH, FAN_GAP),
    lift: -0.13,
    minSpacing: 24,
    orbitable: false,
    /* Separated plates never occlude each other, and a bead dimmed for depth there just reads as one
       sitting on a different layer. */
    depthFog: false,
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

/**
 * How far apart two neighbouring sites land on screen at this yaw, in spacings, taking the tighter of the
 * two in-layer directions.
 *
 * A row step moves `sin(yaw)` sideways and a column step `cos(yaw)`, so one of them shrinks as the other
 * grows and the binding one swaps over at 45°. Click targets are `CELL_HIT_RATIO` wide, so anything below
 * half of that means the near site's target covers the one behind it.
 */
export function siteScreenSpacing(yaw: number): number {
  const radians = toRadians(yaw)
  return Math.min(Math.abs(Math.cos(radians)), Math.abs(Math.sin(radians)))
}

/**
 * Whether every site keeps a clickable gap from its neighbours at this yaw. The tolerance is there for the
 * yaw derived from this same bound, which `asin` and `sin` do not round-trip to the last bit.
 */
export function yawIsClickable(yaw: number, hitRatio = CELL_HIT_RATIO): boolean {
  return siteScreenSpacing(yaw) >= hitRatio / 2 - 1e-9
}

/** Pixels per lattice step, chosen so the whole arrangement fits the stage. */
export function spacingFor(mode: ViewMode, width: number, height: number): number {
  const layout = VIEW_LAYOUTS[mode]
  return Math.max(
    layout.minSpacing,
    Math.min(width / layout.widthUnits, height / layout.heightUnits)
  )
}

/**
 * Exactly the height the arrangement needs at this spacing, so its container has no band left over
 * above or below it.
 *
 * The container's height is set from this and its width is never derived from it. Going the other way,
 * sizing the container from a measurement of the container, is a feedback cycle: the ResizeObserver
 * ends up chasing a box it is itself changing and stops delivering, freezing the board at its floor.
 */
export function deckHeight(mode: ViewMode, spacing: number): number {
  return spacing * VIEW_LAYOUTS[mode].heightUnits
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

/**
 * Opacity for a bead at `depth`, given the depth range of the whole board. Clamped, so a depth from
 * outside the range it was handed still comes back as an opacity rather than something CSS will ignore.
 */
export function fogFor(depth: number, nearest: number, furthest: number): number {
  const span = nearest - furthest
  if (span <= 0) return 1
  const t = Math.max(0, Math.min(1, (depth - furthest) / span))
  return FOG_FLOOR + (1 - FOG_FLOOR) * t
}

export function clampPitch(pitch: number): number {
  return Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch))
}

/**
 * Yaw folded into a single turn. Turning has no limit the way pitch and zoom do, so without this it grows
 * without bound as the board is dragged — harmless in a CSS rotation, but it is the one part of the camera
 * with no invariant, and `yawToFace` reasons about where the angle sits.
 */
export function normalizeYaw(yaw: number): number {
  const turned = yaw % 360
  return turned <= -180 ? turned + 360 : turned > 180 ? turned - 360 : turned
}

export function clampZoom(zoom: number): number {
  return Math.max(ZOOM_RANGE.min, Math.min(ZOOM_RANGE.max, zoom))
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
  /* Straight up or down a rod: parallel to the bar's own axis, so there is no rotation axis to find and
     any perpendicular will do. Pointing down still needs the half turn. */
  if (axisLength < 1e-9) {
    return { length, midpoint, axisX: 1, axisZ: 0, angle: unit.y < 0 ? 180 : 0 }
  }

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
 *
 * A line along one of the board's own axes is widest square-on, at 0° or 90° — which is exactly where the
 * other axis lines up behind itself and its sites stop being clickable. The camera stays after a win, so
 * that angle would be waiting at the start of the next game; the answer is turned off the axis by the
 * smallest amount that keeps both directions apart.
 */
export function yawToFace(from: Vec3, to: Vec3, currentYaw: number): number {
  const dx = to.x - from.x
  const dz = to.z - from.z
  if (Math.hypot(dx, dz) < 1e-9) return currentYaw

  const widest = (Math.atan2(dz, dx) * 180) / Math.PI
  if (yawIsClickable(widest)) return widest

  const limit = (Math.asin(CELL_HIT_RATIO / 2) * 180) / Math.PI
  const nearestAxis = Math.round(widest / 90) * 90
  // Away from the axis in whichever direction the line was already leaning, so the swing stays short.
  const lean = widest >= nearestAxis ? 1 : -1
  return nearestAxis + lean * limit
}
