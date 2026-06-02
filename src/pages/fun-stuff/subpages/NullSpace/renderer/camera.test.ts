import { describe, it, expect } from 'vitest'
import { createCamera, centerCameraOn, worldToScreen, screenToWorld } from './camera'

const WORLD = { x: 3000, y: 3000 }

describe('createCamera', () => {
  it('places the viewport origin at (0, 0) with the given size', () => {
    const cam = createCamera(800, 600)
    expect(cam.x).toBe(0)
    expect(cam.y).toBe(0)
    expect(cam.width).toBe(800)
    expect(cam.height).toBe(600)
  })
})

describe('centerCameraOn', () => {
  it('snaps the camera so the target sits at the viewport center', () => {
    const cam = centerCameraOn(createCamera(800, 600), { x: 1500, y: 1500 }, WORLD)
    expect(cam.x).toBe(1500 - 400)
    expect(cam.y).toBe(1500 - 300)
  })

  it('the snapped camera renders the target at the screen center', () => {
    const cam = centerCameraOn(createCamera(800, 600), { x: 1500, y: 1500 }, WORLD)
    const screen = worldToScreen({ x: 1500, y: 1500 }, cam)
    expect(screen.x).toBe(400)
    expect(screen.y).toBe(300)
  })

  it('clamps to world bounds when the target is near the edge', () => {
    const cam = centerCameraOn(createCamera(800, 600), { x: 100, y: 100 }, WORLD)
    expect(cam.x).toBe(0)
    expect(cam.y).toBe(0)
  })

  it('clamps to world bounds when the target is past the far edge', () => {
    const cam = centerCameraOn(createCamera(800, 600), { x: 5000, y: 5000 }, WORLD)
    expect(cam.x).toBe(WORLD.x - 800)
    expect(cam.y).toBe(WORLD.y - 600)
  })
})

describe('worldToScreen / screenToWorld', () => {
  it('round-trips through a centered camera', () => {
    const cam = centerCameraOn(createCamera(800, 600), { x: 1500, y: 1500 }, WORLD)
    const world = { x: 1234, y: 567 }
    const screen = worldToScreen(world, cam)
    const back = screenToWorld(screen, cam)
    expect(back).toEqual(world)
  })
})
