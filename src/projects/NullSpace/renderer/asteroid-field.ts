import { ASTEROID } from '../data'
import type { Asteroid, GameState, Vec2 } from '../engine/types'
import type { Camera } from './camera'
import { isWithinView, worldToScreen } from './camera'

type Crater = { x: number; y: number; r: number } // x/y/r as fractions of the radius

type AsteroidVariant = {
  verts: number[] // per-vertex radius multipliers (0..1), one polygon loop
  craters: Crater[]
}

// A handful of similar-but-distinct silhouettes; each asteroid picks one at spawn
// (asteroid.variant) so a field doesn't look like clones. Same vertex count so
// they read as the same "kind" of rock, just knocked into different shapes.
const VARIANTS: AsteroidVariant[] = [
  {
    verts: [1.0, 0.82, 0.95, 0.8, 0.92, 0.85, 0.98, 0.83, 0.9],
    craters: [
      { x: -0.25, y: -0.15, r: 0.18 },
      { x: 0.3, y: 0.22, r: 0.12 },
    ],
  },
  {
    verts: [0.9, 0.98, 0.8, 0.93, 0.82, 0.96, 0.84, 0.92, 0.86],
    craters: [
      { x: 0.2, y: -0.25, r: 0.16 },
      { x: -0.28, y: 0.18, r: 0.13 },
    ],
  },
  {
    verts: [0.95, 0.85, 0.9, 0.98, 0.8, 0.88, 0.95, 0.82, 0.93],
    craters: [
      { x: -0.1, y: 0.3, r: 0.15 },
      { x: 0.32, y: -0.1, r: 0.1 },
      { x: -0.3, y: -0.2, r: 0.1 },
    ],
  },
  {
    verts: [0.84, 0.92, 0.86, 0.8, 0.98, 0.83, 0.9, 0.96, 0.82],
    craters: [{ x: 0.25, y: 0.15, r: 0.17 }],
  },
  {
    verts: [0.92, 0.8, 0.96, 0.84, 0.9, 0.98, 0.82, 0.94, 0.86],
    craters: [
      { x: -0.22, y: -0.22, r: 0.14 },
      { x: 0.18, y: 0.28, r: 0.12 },
    ],
  },
]

function renderHealthBar(ctx: CanvasRenderingContext2D, a: Asteroid, screen: Vec2): void {
  if (a.hp >= a.maxHp) return
  const frac = Math.max(0, a.hp / a.maxHp)
  const w = a.radius * 1.3
  const h = 3
  const x = screen.x - w / 2
  const y = screen.y - a.radius - 9
  ctx.save()
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = frac > 0.5 ? '#cdbba6' : '#e08a55'
  ctx.fillRect(x, y, w * frac, h)
  ctx.restore()
}

function renderAsteroid(ctx: CanvasRenderingContext2D, a: Asteroid, camera: Camera): void {
  const s = worldToScreen(a.pos, camera)
  if (!isWithinView(s, camera, a.radius + 20)) return

  const variant = VARIANTS[(a.variant ?? 0) % VARIANTS.length]

  ctx.save()
  ctx.translate(s.x, s.y)
  ctx.rotate(a.spin)

  ctx.beginPath()
  for (let i = 0; i < variant.verts.length; i++) {
    const ang = (Math.PI * 2 * i) / variant.verts.length
    const r = a.radius * variant.verts[i]
    const x = Math.cos(ang) * r
    const y = Math.sin(ang) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = ASTEROID.color
  ctx.fill()
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)'
  for (const c of variant.craters) {
    ctx.beginPath()
    ctx.arc(c.x * a.radius, c.y * a.radius, c.r * a.radius, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()

  // Health bar in screen space (un-rotated), shown once the rock is chipped.
  renderHealthBar(ctx, a, s)
}

// Drifting asteroids — drawn in the world layer (behind entities) alongside mines.
export function renderAsteroidField(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  camera: Camera
): void {
  for (const a of state.asteroids) renderAsteroid(ctx, a, camera)
}
