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

const WORLD = { x: 3000, y: 3000 }

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

describe('computeZoom (area-based)', () => {
  it('returns DEFAULT_GAME_ZOOM at the reference area', () => {
    expect(computeZoom(W, H)).toBeCloseTo(DEFAULT_GAME_ZOOM, 5)
  })

  it('returns > DEFAULT_GAME_ZOOM when canvas area exceeds the reference', () => {
    expect(computeZoom(W * 2, H * 2)).toBeCloseTo(2 * DEFAULT_GAME_ZOOM, 5)
  })

  it('returns < DEFAULT_GAME_ZOOM when canvas area is smaller', () => {
    expect(computeZoom(W / 2, H / 2)).toBeCloseTo(0.5 * DEFAULT_GAME_ZOOM, 5)
  })

  it('keeps total visible world area approximately constant', () => {
    // Fullscreen vs mobile: very different shapes, similar total visible area.
    const fullscreen = computeZoom(1920, 1080)
    const mobile = computeZoom(375, 812)
    const fullscreenArea = (1920 / fullscreen) * (1080 / fullscreen)
    const mobileArea = (375 / mobile) * (812 / mobile)
    expect(fullscreenArea).toBeCloseTo(mobileArea, 0)
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
    const cam = { x: 0, y: 0, width: 375, height: 812, zoom: computeZoom(375, 812) }
    const onScreen = worldToScreen({ x: 500, y: 0 }, cam)
    expect(500).toBeGreaterThan(cam.width) // beyond the canvas-pixel bound...
    expect(isWithinView(onScreen, cam, 0)).toBe(true) // ...but still visible
  })

  it('culls a position past the visible world extent', () => {
    const cam = { x: 0, y: 0, width: 375, height: 812, zoom: computeZoom(375, 812) }
    const vw = cam.width / cam.zoom
    expect(isWithinView({ x: vw + 100, y: 0 }, cam, 0)).toBe(false)
  })

  it('honors the world-unit margin on every edge', () => {
    const cam = { x: 0, y: 0, width: W, height: H, zoom: 1 }
    expect(isWithinView({ x: -5, y: -5 }, cam, 10)).toBe(true)
    expect(isWithinView({ x: -15, y: 0 }, cam, 10)).toBe(false)
    expect(isWithinView({ x: W + 5, y: H + 5 }, cam, 10)).toBe(true)
    expect(isWithinView({ x: 0, y: H + 15 }, cam, 10)).toBe(false)
  })
})

describe('centerCameraOn', () => {
  it('snaps the camera so the target sits at the viewport center', () => {
    const cam = centerCameraOn(unitZoomCamera(), { x: 1500, y: 1500 }, WORLD)
    expect(cam.x).toBe(1500 - W / 2)
    expect(cam.y).toBe(1500 - H / 2)
  })

  it('the snapped camera renders the target at the screen center (in pre-zoom coords)', () => {
    const cam = centerCameraOn(unitZoomCamera(), { x: 1500, y: 1500 }, WORLD)
    const screen = worldToScreen({ x: 1500, y: 1500 }, cam)
    expect(screen.x).toBe(W / 2)
    expect(screen.y).toBe(H / 2)
  })

  it('accounts for zoom — at zoom 0.5 the camera shows twice as much world', () => {
    const cam = centerCameraOn({ ...createCamera(W, H), zoom: 0.5 }, { x: 1500, y: 1500 }, WORLD)
    // visible world width = W / 0.5 = 2W; camera.x = ship.x - W (half of 2W)
    expect(cam.x).toBe(1500 - W)
    expect(cam.y).toBe(1500 - H)
  })

  it('clamps to world bounds when the target is near the edge', () => {
    const cam = centerCameraOn(unitZoomCamera(), { x: 100, y: 100 }, WORLD)
    expect(cam.x).toBe(0)
    expect(cam.y).toBe(0)
  })

  it('clamps to world bounds when the target is past the far edge', () => {
    const cam = centerCameraOn(unitZoomCamera(), { x: 5000, y: 5000 }, WORLD)
    expect(cam.x).toBe(WORLD.x - W)
    expect(cam.y).toBe(WORLD.y - H)
  })
})

describe('worldToScreen / screenToWorld', () => {
  it('round-trips through a centered camera (zoom = 1)', () => {
    const cam = centerCameraOn(unitZoomCamera(), { x: 1500, y: 1500 }, WORLD)
    const world = { x: 1234, y: 567 }
    const screen = worldToScreen(world, cam)
    const back = screenToWorld({ x: screen.x * cam.zoom, y: screen.y * cam.zoom }, cam)
    expect(back).toEqual(world)
  })

  it('screenToWorld accounts for zoom (clicks land at the right world position)', () => {
    // At zoom 2, a click 100 canvas pixels right of the camera origin is 50
    // world units right of the camera origin.
    const cam = { ...createCamera(W, H), x: 0, y: 0, zoom: 2 }
    const world = screenToWorld({ x: 100, y: 0 }, cam)
    expect(world.x).toBe(50)
  })
})
