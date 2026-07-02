import type { Vec2 } from '../engine/types'
import { toroidalDelta, wrapPosition } from '../engine/math/toroid'

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

// Damage screen-shake tuning. On a hit the world jitters for SHAKE_DURATION and
// eases back to still; SHAKE_MAGNITUDE is the peak offset in CSS pixels, and the
// two frequencies keep x/y out of phase so the wobble reads as a rattle, not a slide.
// Both amplitude and length scale off the timer, so a weaker trigger (a shield hit)
// reads as a shorter, gentler rattle than a full HP hit.
const SHAKE_DURATION = 0.32
const SHAKE_MAGNITUDE = 9
const SHAKE_FREQ_X = 47
const SHAKE_FREQ_Y = 61

// Shield hits get a lighter jolt than HP hits — the shield still absorbed the blow.
export const SHAKE_STRENGTH_HP = 1
export const SHAKE_STRENGTH_SHIELD = 0.45

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
  /** Seconds left in the damage shake (0 = still). Decays in updateCamera. */
  shake: number
}

export function createCamera(viewportWidth: number, viewportHeight: number): Camera {
  return {
    x: 0,
    y: 0,
    width: viewportWidth,
    height: viewportHeight,
    zoom: computeZoom(viewportWidth, viewportHeight),
    dpr: 1,
    shake: 0,
  }
}

/**
 * Kick off (or refresh) the damage shake. `strength` scales both amplitude and
 * length (1 = a full HP hit, less = a lighter shield hit). Never shortens a
 * stronger shake still ringing, so a light shield tap can't cut an HP jolt short.
 */
export function triggerCameraShake(camera: Camera, strength = SHAKE_STRENGTH_HP): Camera {
  return { ...camera, shake: Math.max(camera.shake, SHAKE_DURATION * strength) }
}

/**
 * Current shake offset in CSS pixels for this frame. Amplitude fades linearly with
 * the remaining time and two out-of-phase sinusoids driven by `clock` (seconds)
 * jitter x/y — deterministic, so it never touches the seeded sim rng.
 */
export function cameraShakeOffset(camera: Camera, clock: number): Vec2 {
  if (camera.shake <= 0) return { x: 0, y: 0 }
  const amp = SHAKE_MAGNITUDE * (camera.shake / SHAKE_DURATION)
  return {
    x: amp * Math.sin(clock * SHAKE_FREQ_X),
    y: amp * Math.cos(clock * SHAKE_FREQ_Y),
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

// Stores the camera origin wrapped into [0, world) so it never grows unbounded
// over an endless run.
function wrapCameraOrigin(camera: Camera, x: number, y: number): Camera {
  const w = wrapPosition({ x, y })
  return { ...camera, x: w.x, y: w.y }
}

// Follows `target` (the ship) on the torus: the camera centre chases the
// target's NEAREST image, so crossing a world seam pans smoothly instead of
// whipping the long way around.
export function updateCamera(camera: Camera, target: Vec2, dt: number): Camera {
  const vw = viewportWorldWidth(camera)
  const vh = viewportWorldHeight(camera)
  const center = { x: camera.x + vw / 2, y: camera.y + vh / 2 }
  const d = toroidalDelta(center, target)
  const lerp = 1 - Math.pow(0.01, dt)
  const shaken = { ...camera, shake: Math.max(0, camera.shake - dt) }
  return wrapCameraOrigin(shaken, shaken.x + d.x * lerp, shaken.y + d.y * lerp)
}

/** Snap the camera so its viewport is centred on `target` (torus-wrapped). */
export function centerCameraOn(camera: Camera, target: Vec2): Camera {
  const vw = viewportWorldWidth(camera)
  const vh = viewportWorldHeight(camera)
  return wrapCameraOrigin(camera, target.x - vw / 2, target.y - vh / 2)
}

/**
 * World coord → "render-space" coord. NOT canvas pixels — `renderFrame` sets up
 * `ctx.scale(camera.zoom, camera.zoom)`, so both position and drawn size scale
 * by `zoom` (a 16px sprite renders at 16·zoom px). Torus-aware: `pos` is placed
 * at its image nearest the viewport centre, so an entity just over a world seam
 * still draws adjacent (no jump at the edge). Only that single nearest image is
 * drawn — which assumes the viewport stays narrower than the world (true at all
 * current zoom levels); a wider one would need the far side tiled in to fill it.
 */
export function worldToScreen(pos: Vec2, camera: Camera): Vec2 {
  const vw = viewportWorldWidth(camera)
  const vh = viewportWorldHeight(camera)
  const center = { x: camera.x + vw / 2, y: camera.y + vh / 2 }
  const d = toroidalDelta(center, pos)
  return { x: vw / 2 + d.x, y: vh / 2 + d.y }
}

/**
 * World coord → CSS-pixel position, for overlays drawn AFTER the world frame in
 * the DPR baseline (no `ctx.scale(zoom)` active). `worldToScreen` is render-space;
 * multiplying by `zoom` lands it in CSS pixels. Pair with `pinDprTransform`.
 */
export function worldToScreenPx(pos: Vec2, camera: Camera): Vec2 {
  const rs = worldToScreen(pos, camera)
  return { x: rs.x * camera.zoom, y: rs.y * camera.zoom }
}

/**
 * Reset the context to the DPR baseline so a screen-space overlay is immune to any
 * transform a world-layer renderer left behind. Call before drawing the overlay.
 */
export function pinDprTransform(ctx: CanvasRenderingContext2D, camera: Camera): void {
  ctx.setTransform(camera.dpr, 0, 0, camera.dpr, 0, 0)
}

/** Canvas pixel → world coord (click input), wrapped back into the torus. */
export function screenToWorld(screenPos: Vec2, camera: Camera): Vec2 {
  return wrapPosition({
    x: screenPos.x / camera.zoom + camera.x,
    y: screenPos.y / camera.zoom + camera.y,
  })
}
