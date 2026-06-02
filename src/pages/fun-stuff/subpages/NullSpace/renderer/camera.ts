import type { Vec2 } from '../engine/types'

export type Camera = {
  x: number
  y: number
  width: number
  height: number
}

export function createCamera(viewportWidth: number, viewportHeight: number): Camera {
  return { x: 0, y: 0, width: viewportWidth, height: viewportHeight }
}

export function updateCamera(camera: Camera, target: Vec2, dt: number, worldSize: Vec2): Camera {
  const targetX = target.x - camera.width / 2
  const targetY = target.y - camera.height / 2
  const lerp = 1 - Math.pow(0.01, dt)

  let x = camera.x + (targetX - camera.x) * lerp
  let y = camera.y + (targetY - camera.y) * lerp

  x = Math.max(0, Math.min(worldSize.x - camera.width, x))
  y = Math.max(0, Math.min(worldSize.y - camera.height, y))

  return { ...camera, x, y }
}

/** Snap the camera so its viewport is centered on `target`, clamped to world bounds. */
export function centerCameraOn(camera: Camera, target: Vec2, worldSize: Vec2): Camera {
  const targetX = target.x - camera.width / 2
  const targetY = target.y - camera.height / 2
  const x = Math.max(0, Math.min(worldSize.x - camera.width, targetX))
  const y = Math.max(0, Math.min(worldSize.y - camera.height, targetY))
  return { ...camera, x, y }
}

export function worldToScreen(pos: Vec2, camera: Camera): Vec2 {
  return {
    x: pos.x - camera.x,
    y: pos.y - camera.y,
  }
}

export function screenToWorld(screenPos: Vec2, camera: Camera): Vec2 {
  return {
    x: screenPos.x + camera.x,
    y: screenPos.y + camera.y,
  }
}
