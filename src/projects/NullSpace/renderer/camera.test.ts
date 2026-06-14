import { describe, it, expect } from 'vitest'
import {
  REFERENCE_VIEW,
  DEFAULT_GAME_ZOOM,
  computeZoom,
  computeHudScale,
  HUD_SCALE_MIN,
  HUD_SCALE_MAX,
  createCamera,
  centerCameraOn,
  worldToScreen,
  screenToWorld,
  isWithinView,
} from './camera'
import { WORLD_SIZE } from '../data'

const W = REFERENCE_VIEW.width
const H = REFERENCE_VIEW.height

// Helper for tests that exercise centering / projection math at an identity
// zoom — keeps `1 canvas pixel = 1 world unit` so the assertions stay
// trivially readable. The default game camera applies DEFAULT_GAME_ZOOM on
// top of the area ratio, so we override that here.
const unitZoomCamera = () => ({ ...createCamera(W, H), zoom: 1 })

describe('createCamera', () => {
  it('places the viewport origin at (0, 0) with the given size', () => {
    const cam = createCamera(W, H)
    expect(cam.x).toBe(0)
    expect(cam.y).toBe(0)
    expect(cam.width).toBe(W)
    expect(cam.height).toBe(H)
  })

  it('zoom at the reference view size is the default game zoom (more world visible)', () => {
    expect(createCamera(W, H).zoom).toBeCloseTo(DEFAULT_GAME_ZOOM, 5)
  })
})

describe('computeZoom (geometric mean of area + min-dim)', () => {
  it('returns DEFAULT_GAME_ZOOM at the reference view size', () => {
    expect(computeZoom(W, H)).toBeCloseTo(DEFAULT_GAME_ZOOM, 5)
  })

  it('scales linearly when both dimensions scale uniformly', () => {
    // At 2× both axes: area scale = 2, min-dim scale = 2 → geo mean = 2.
    expect(computeZoom(W * 2, H * 2)).toBeCloseTo(2 * DEFAULT_GAME_ZOOM, 5)
    expect(computeZoom(W / 2, H / 2)).toBeCloseTo(0.5 * DEFAULT_GAME_ZOOM, 5)
  })

  it('zooms out further on wide-short viewports than pure area would', () => {
    // Landscape phone fullscreen — pure-area-based zoom = ~0.617 was too tight
    // vertically. New formula folds in min-dim so the short side drags zoom down.
    const phoneLandscape = computeZoom(844, 390)
    const areaOnly = Math.sqrt((844 * 390) / (W * H)) * DEFAULT_GAME_ZOOM
    expect(phoneLandscape).toBeLessThan(areaOnly)
  })

  it('is symmetric across orientations (same min-dim → same zoom)', () => {
    // Phone landscape vs portrait with swapped dimensions: both should produce
    // the same zoom, because area and min-dim are both invariant under swap.
    expect(computeZoom(844, 390)).toBeCloseTo(computeZoom(390, 844), 5)
  })
})

describe('computeHudScale', () => {
  it('is 1 at the reference view size', () => {
    expect(computeHudScale(W, H)).toBeCloseTo(1, 5)
  })

  it('grows when the container is larger than the reference', () => {
    expect(computeHudScale(1600, 1000)).toBeGreaterThan(1)
  })

  it('clamps to HUD_SCALE_MAX at very large sizes (no absurd HUDs on 4K)', () => {
    expect(computeHudScale(4000, 3000)).toBe(HUD_SCALE_MAX)
  })

  it('clamps to HUD_SCALE_MIN at very small sizes (still readable)', () => {
    expect(computeHudScale(200, 100)).toBe(HUD_SCALE_MIN)
  })
})

describe('isWithinView', () => {
  it('keeps a position that is on-screen at zoom < 1 (not culled against canvas pixels)', () => {
    // Regression: the cull bounds must use the visible WORLD extent
    // (width / zoom), not raw canvas pixels. On a 375px-wide phone at the
    // mobile zoom, ~635 world units are visible, so a point at world-x 500 is
    // on screen — comparing against camera.width (375) would wrongly cull it.
    const cam = { x: 0, y: 0, width: 375, height: 812, zoom: computeZoom(375, 812), dpr: 1 }
    const onScreen = worldToScreen({ x: 500, y: 0 }, cam)
    expect(500).toBeGreaterThan(cam.width) // beyond the canvas-pixel bound...
    expect(isWithinView(onScreen, cam, 0)).toBe(true) // ...but still visible
  })

  it('culls a position past the visible world extent', () => {
    const cam = { x: 0, y: 0, width: 375, height: 812, zoom: computeZoom(375, 812), dpr: 1 }
    const vw = cam.width / cam.zoom
    expect(isWithinView({ x: vw + 100, y: 0 }, cam, 0)).toBe(false)
  })

  it('honors the world-unit margin on every edge', () => {
    const cam = { x: 0, y: 0, width: W, height: H, zoom: 1, dpr: 1 }
    expect(isWithinView({ x: -5, y: -5 }, cam, 10)).toBe(true)
    expect(isWithinView({ x: -15, y: 0 }, cam, 10)).toBe(false)
    expect(isWithinView({ x: W + 5, y: H + 5 }, cam, 10)).toBe(true)
    expect(isWithinView({ x: 0, y: H + 15 }, cam, 10)).toBe(false)
  })
})

describe('centerCameraOn', () => {
  it('snaps the camera so the target renders at the viewport center', () => {
    const cam = centerCameraOn(unitZoomCamera(), { x: 1300, y: 1300 })
    const screen = worldToScreen({ x: 1300, y: 1300 }, cam)
    expect(screen.x).toBeCloseTo(W / 2, 4)
    expect(screen.y).toBeCloseTo(H / 2, 4)
  })

  it('accounts for zoom — at zoom 0.5 the camera shows twice as much world', () => {
    const cam = centerCameraOn({ ...createCamera(W, H), zoom: 0.5 }, { x: 1300, y: 1300 })
    const screen = worldToScreen({ x: 1300, y: 1300 }, cam)
    expect(screen.x).toBeCloseTo(W / 0.5 / 2, 4)
    expect(screen.y).toBeCloseTo(H / 0.5 / 2, 4)
  })

  it('wraps the camera origin instead of clamping (the torus has no edge)', () => {
    // Centring on a target near 0 wraps the origin to the far side rather than
    // pinning to 0 — and the target still renders dead centre.
    const cam = centerCameraOn(unitZoomCamera(), { x: 10, y: 10 })
    expect(cam.x).toBeGreaterThan(WORLD_SIZE.x / 2) // wrapped, not clamped to 0
    const screen = worldToScreen({ x: 10, y: 10 }, cam)
    expect(screen.x).toBeCloseTo(W / 2, 4)
    expect(screen.y).toBeCloseTo(H / 2, 4)
  })
})

describe('worldToScreen / screenToWorld', () => {
  it('round-trips through a centered camera (zoom = 1)', () => {
    const cam = centerCameraOn(unitZoomCamera(), { x: 1300, y: 1300 })
    const world = { x: 1234, y: 567 }
    const screen = worldToScreen(world, cam)
    const back = screenToWorld({ x: screen.x * cam.zoom, y: screen.y * cam.zoom }, cam)
    expect(back.x).toBeCloseTo(world.x, 3)
    expect(back.y).toBeCloseTo(world.y, 3)
  })

  it('draws an entity across the seam at its nearest image (no long-way jump)', () => {
    // Camera near the top edge; an entity near the bottom edge is one short hop
    // UP across the seam, so it draws just above centre — not a world away.
    const cam = centerCameraOn(unitZoomCamera(), { x: 1300, y: 50 })
    const screen = worldToScreen({ x: 1300, y: WORLD_SIZE.y - 30 }, cam)
    expect(screen.y).toBeLessThan(H / 2)
    expect(H / 2 - screen.y).toBeCloseTo(80, 3) // 50 → (size-30) is 80 units up
  })

  it('screenToWorld accounts for zoom (clicks land at the right world position)', () => {
    const cam = { ...createCamera(W, H), x: 0, y: 0, zoom: 2 }
    const world = screenToWorld({ x: 100, y: 0 }, cam)
    expect(world.x).toBeCloseTo(50, 4)
  })
})
