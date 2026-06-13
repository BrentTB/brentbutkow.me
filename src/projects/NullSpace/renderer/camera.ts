import type { Vec2 } from '../engine/types'

/**
 * Reference canvas size that defines the "intended" zoom level (1.0).
 * Other canvas sizes use an area-based zoom so the total visible world area
 * stays roughly constant — that decouples gameplay from viewport size
 * (fullscreen + mobile no longer reveal/hide world content).
 */
export const REFERENCE_VIEW = { width: 1000, height: 625 }

/**
 * Default camera zoom multiplier applied on top of the area ratio. <1 means
 * the game starts more zoomed-OUT than a 1:1 mapping of reference-view
 * pixels to world units — more total world visible at a glance. Only the
 * camera uses this; HUD scale is unaffected.
 */
export const DEFAULT_GAME_ZOOM = 0.85

export type Camera = {
  /** Top-left of the viewport in WORLD coordinates. */
  x: number
  y: number
  /** Canvas size in CSS pixels (not device pixels). */
  width: number
  height: number
  /** Canvas pixels per world unit. */
  zoom: number
  /** Device pixel ratio — canvas internal resolution is width/height × dpr. */
  dpr: number
}

export function createCamera(viewportWidth: number, viewportHeight: number): Camera {
  return {
    x: 0,
    y: 0,
    width: viewportWidth,
    height: viewportHeight,
    zoom: computeZoom(viewportWidth, viewportHeight),
    dpr: 1,
  }
}

/** sqrt(area/referenceArea). Used for HUD scale and as one input to zoom. */
function areaScale(canvasWidth: number, canvasHeight: number): number {
  const targetArea = REFERENCE_VIEW.width * REFERENCE_VIEW.height
  const canvasArea = canvasWidth * canvasHeight
  if (canvasArea <= 0) return 1
  return Math.sqrt(canvasArea / targetArea)
}

/** Min-dimension scale relative to the reference's short side. */
function minDimScale(canvasWidth: number, canvasHeight: number): number {
  const refMin = Math.min(REFERENCE_VIEW.width, REFERENCE_VIEW.height)
  const min = Math.min(canvasWidth, canvasHeight)
  if (min <= 0) return 1
  return min / refMin
}

/**
 * Geometric mean of area-scale and min-dim-scale, times DEFAULT_GAME_ZOOM.
 * Pure area-based zoom over-zooms on wide-short viewports (landscape phone
 * fullscreen) because horizontal pixels dominate the area term. Folding in
 * min-dim scale lowers zoom when the SHORT dimension is small, so a short
 * landscape phone shows more world vertically without making desktop tiny.
 */
export function computeZoom(canvasWidth: number, canvasHeight: number): number {
  const a = areaScale(canvasWidth, canvasHeight)
  const m = minDimScale(canvasWidth, canvasHeight)
  return Math.sqrt(a * m) * DEFAULT_GAME_ZOOM
}

/**
 * HUD scale uses the raw area ratio (no DEFAULT_GAME_ZOOM applied), clamped
 * so the overlay UI never gets uncomfortably small (tiny windows) or
 * absurdly large (4K monitor). Decoupling from camera zoom lets us push the
 * gameplay view further out without shrinking the HUD with it.
 */
export const HUD_SCALE_MIN = 0.9
export const HUD_SCALE_MAX = 1.6

export function computeHudScale(containerWidth: number, containerHeight: number): number {
  const raw = areaScale(containerWidth, containerHeight)
  return Math.min(HUD_SCALE_MAX, Math.max(HUD_SCALE_MIN, raw))
}

/** Visible world width in world units for the given camera. */
function viewportWorldWidth(camera: Camera): number {
  return camera.width / camera.zoom
}
function viewportWorldHeight(camera: Camera): number {
  return camera.height / camera.zoom
}

/**
 * Off-screen cull test for a `worldToScreen` position. The visible extent is
 * the world width/height (`camera.width / zoom`), NOT the raw canvas pixels —
 * at zoom < 1 the canvas shows more world than its pixel size, so culling
 * against canvas pixels drops entities that are still on screen. `margin` is in
 * world units and keeps just-off-screen entities drawn while they slide in.
 */
export function isWithinView(screen: Vec2, camera: Camera, margin: number): boolean {
  const vw = viewportWorldWidth(camera)
  const vh = viewportWorldHeight(camera)
  return (
    screen.x >= -margin && screen.x <= vw + margin && screen.y >= -margin && screen.y <= vh + margin
  )
}

/**
 * Clamps a camera top-left coordinate to the world on one axis. When the world
 * extent is smaller than the viewport (e.g. a 1400-wide corridor on a wide
 * desktop), the world is centered instead of pinned to the 0 edge.
 */
export function clampCameraAxis(
  target: number,
  worldExtent: number,
  viewportExtent: number
): number {
  if (worldExtent <= viewportExtent) return (worldExtent - viewportExtent) / 2
  return Math.max(0, Math.min(worldExtent - viewportExtent, target))
}

export function updateCamera(camera: Camera, target: Vec2, dt: number, worldSize: Vec2): Camera {
  const vw = viewportWorldWidth(camera)
  const vh = viewportWorldHeight(camera)
  const targetX = target.x - vw / 2
  const targetY = target.y - vh / 2
  const lerp = 1 - Math.pow(0.01, dt)

  const x = clampCameraAxis(camera.x + (targetX - camera.x) * lerp, worldSize.x, vw)
  const y = clampCameraAxis(camera.y + (targetY - camera.y) * lerp, worldSize.y, vh)

  return { ...camera, x, y }
}

/** Snap the camera so its viewport is centered on `target`, clamped to world bounds. */
export function centerCameraOn(camera: Camera, target: Vec2, worldSize: Vec2): Camera {
  const vw = viewportWorldWidth(camera)
  const vh = viewportWorldHeight(camera)
  const x = clampCameraAxis(target.x - vw / 2, worldSize.x, vw)
  const y = clampCameraAxis(target.y - vh / 2, worldSize.y, vh)
  return { ...camera, x, y }
}

/**
 * World coord → "render-space" coord. NOT canvas pixels — `renderFrame` sets up
 * `ctx.scale(camera.zoom, camera.zoom)` so the canvas applies the zoom
 * multiplication. Render code treats this output as a 1:1-with-the-active-
 * transform position, which makes BOTH position AND drawn size scale together
 * (a 16-px sprite drawn at this coord appears as 16*zoom canvas pixels).
 */
export function worldToScreen(pos: Vec2, camera: Camera): Vec2 {
  return {
    x: pos.x - camera.x,
    y: pos.y - camera.y,
  }
}

/** Canvas pixel → world coord. Used for click input — accounts for zoom. */
export function screenToWorld(screenPos: Vec2, camera: Camera): Vec2 {
  return {
    x: screenPos.x / camera.zoom + camera.x,
    y: screenPos.y / camera.zoom + camera.y,
  }
}
