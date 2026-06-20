import { WORMHOLE } from '../../data'
import { spawnExplosionParticles, uid } from '../entities/entity-creator'
import { rng } from '../math/random'
import { toroidalDelta, toroidalDistance, wrapPosition } from '../math/toroid'
import { EffectKind } from '../types'
import type {
  ActiveEffect,
  Ally,
  Asteroid,
  Enemy,
  Particle,
  Projectile,
  Ship,
  Vec2,
  WormholeEffect,
} from '../types'
import type { Camera } from '../../renderer/camera'
import { worldToScreen } from '../../renderer/camera'
import { passThroughTick } from '../systems/effect-definition'
import type {
  EffectDefinition,
  EffectTickContext,
  EffectTickResult,
} from '../systems/effect-definition'

// Teal teleport flash, matching WORMHOLE.color.
const FLASH_COLOR = '#3cc8d2'

export function createWormhole(posA: Vec2, posB: Vec2, vel: Vec2): WormholeEffect {
  return {
    id: uid(),
    kind: EffectKind.wormhole,
    pos: { ...posA },
    posB: { ...posB },
    vel: { ...vel },
    elapsed: 0,
    duration: WORMHOLE.duration,
    startRadius: WORMHOLE.startRadius,
    maxRadius: WORMHOLE.maxRadius,
    growDuration: WORMHOLE.growDuration,
  }
}

// Positions for a fresh pair near the ship: mouth A at a random bearing, mouth B at an
// independent random angle from A and a bit further out. The separation is always wider
// than a mouth's exit reach (2*maxRadius + exitMargin), so no orientation lets one mouth's
// exit land inside the other — the pair can't cross-loop, however it ends up tilted.
export function wormholePairPositions(shipPos: Vec2): { posA: Vec2; posB: Vec2 } {
  const bearing = rng.next() * Math.PI * 2
  const posA = wrapPosition({
    x: shipPos.x + Math.cos(bearing) * WORMHOLE.spawnRangeNear,
    y: shipPos.y + Math.sin(bearing) * WORMHOLE.spawnRangeNear,
  })
  const sepAngle = rng.next() * Math.PI * 2
  const sep = rng.range(WORMHOLE.separationMin, WORMHOLE.separationMax)
  const posB = wrapPosition({
    x: posA.x + Math.cos(sepAngle) * sep,
    y: posA.y + Math.sin(sepAngle) * sep,
  })
  return { posA, posB }
}

// Live mouth radius: swells startRadius → maxRadius over growDuration, then holds.
export function wormholeRadiusAt(w: WormholeEffect, elapsed: number): number {
  const t = w.growDuration > 0 ? Math.min(1, elapsed / w.growDuration) : 1
  return w.startRadius + (w.maxRadius - w.startRadius) * t
}

// Lifetime + drift only. The teleport needs ship/allies/asteroids/projectiles, so it
// runs in the main loop's calamity pass (see applyWormholes). Both mouths drift
// together at `vel`, keeping their separation.
function tickWormhole(w: WormholeEffect, ctx: EffectTickContext): EffectTickResult {
  if (w.elapsed >= w.duration) return passThroughTick(null, ctx)
  const drifted: WormholeEffect = {
    ...w,
    pos: wrapPosition({ x: w.pos.x + w.vel.x * ctx.dt, y: w.pos.y + w.vel.y * ctx.dt }),
    posB: wrapPosition({ x: w.posB.x + w.vel.x * ctx.dt, y: w.posB.y + w.vel.y * ctx.dt }),
  }
  return passThroughTick(drifted, ctx)
}

// Where a body crossing a mouth comes out: just beyond the far mouth's rim, in the
// body's travel direction — so it lands clear and moving away, never instantly
// re-entering. Falls back to its entry direction, then the mouth-to-mouth axis.
function exitPos(body: { pos: Vec2; vel: Vec2 }, entry: Vec2, exit: Vec2, radius: number): Vec2 {
  let dx = body.vel.x
  let dy = body.vel.y
  let mag = Math.hypot(dx, dy)
  if (mag < 0.0001) {
    const into = toroidalDelta(entry, body.pos) // the way it came into the mouth
    dx = into.x
    dy = into.y
    mag = Math.hypot(dx, dy)
  }
  if (mag < 0.0001) {
    const axis = toroidalDelta(entry, exit)
    dx = axis.x
    dy = axis.y
    mag = Math.hypot(dx, dy)
  }
  if (mag < 0.0001) {
    dx = 1
    dy = 0
    mag = 1
  }
  const d = radius + WORMHOLE.exitMargin
  return wrapPosition({ x: exit.x + (dx / mag) * d, y: exit.y + (dy / mag) * d })
}

export type WormholeResult = {
  ship: Ship
  enemies: Enemy[]
  allies: Ally[]
  asteroids: Asteroid[]
  projectiles: Projectile[]
  particles: Particle[]
}

// Teleports every body that touches a rift mouth to the far mouth, velocity preserved
// (the ship keeps its fling coast too — only its position moves). Neutral: no damage,
// the jump itself is the hazard. A body teleports at most once per frame (`moved`) and
// exits beyond the far rim, so it can't ping-pong. Projectiles get prevPos reset so
// their swept-collision segment doesn't sweep the whole map from entry to exit.
export function applyWormholes(
  effects: ActiveEffect[],
  ship: Ship,
  enemies: Enemy[],
  allies: Ally[],
  asteroids: Asteroid[],
  projectiles: Projectile[]
): WormholeResult {
  let curShip = ship
  let curEnemies = enemies
  let curAllies = allies
  let curAsteroids = asteroids
  let curProjectiles = projectiles
  const particles: Particle[] = []
  const moved = new Set<string>()

  function transit<T extends { id: string; pos: Vec2; vel: Vec2 }>(
    body: T,
    a: Vec2,
    b: Vec2,
    radius: number
  ): T {
    if (moved.has(body.id)) return body
    let entry: Vec2
    let exit: Vec2
    if (toroidalDistance(body.pos, a) <= radius) {
      entry = a
      exit = b
    } else if (toroidalDistance(body.pos, b) <= radius) {
      entry = b
      exit = a
    } else {
      return body
    }
    moved.add(body.id)
    const newPos = exitPos(body, entry, exit, radius)
    particles.push(
      ...spawnExplosionParticles(body.pos, 5, FLASH_COLOR),
      ...spawnExplosionParticles(newPos, 5, FLASH_COLOR)
    )
    return { ...body, pos: newPos }
  }

  for (const e of effects) {
    if (e.kind !== EffectKind.wormhole) continue
    const radius = wormholeRadiusAt(e, e.elapsed)
    const a = e.pos
    const b = e.posB
    curShip = transit(curShip, a, b, radius)
    curEnemies = curEnemies.map((en) => transit(en, a, b, radius))
    curAllies = curAllies.map((al) => transit(al, a, b, radius))
    curAsteroids = curAsteroids.map((as) => transit(as, a, b, radius))
    curProjectiles = curProjectiles.map((p) => transit(p, a, b, radius))
  }

  // A teleported projectile must drop its stale prevPos, or its swept-collision
  // segment would run from the entry mouth across the map to the exit.
  if (moved.size > 0) {
    curProjectiles = curProjectiles.map((p) =>
      moved.has(p.id) ? { ...p, prevPos: { ...p.pos } } : p
    )
  }

  return {
    ship: curShip,
    enemies: curEnemies,
    allies: curAllies,
    asteroids: curAsteroids,
    projectiles: curProjectiles,
    particles,
  }
}

// One rift mouth: a teal glow + a bright core ring + swirling arcs (animated by the
// effect's elapsed). `swirl` flips per mouth so the pair reads as mirrored + linked.
function renderRift(
  ctx: CanvasRenderingContext2D,
  center: Vec2,
  radius: number,
  swirl: number,
  camera: Camera
): void {
  const s = worldToScreen(center, camera)
  ctx.save()
  ctx.translate(s.x, s.y)

  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius)
  grad.addColorStop(0, 'rgba(60, 200, 210, 0.85)')
  grad.addColorStop(0.4, 'rgba(40, 150, 180, 0.5)')
  grad.addColorStop(0.75, 'rgba(30, 110, 150, 0.18)')
  grad.addColorStop(1, 'rgba(30, 110, 150, 0)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = 'rgba(120, 230, 240, 0.5)'
  ctx.lineWidth = 1.5
  for (let ring = 0; ring < 3; ring++) {
    const r = radius * (0.3 + ring * 0.22)
    const rot = swirl * (2 + ring) + ring * 2
    ctx.beginPath()
    ctx.arc(0, 0, r, rot, rot + Math.PI * 1.3)
    ctx.stroke()
  }

  ctx.strokeStyle = 'rgba(60, 200, 210, 0.9)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(0, 0, radius * 0.5, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

function renderWormhole(ctx: CanvasRenderingContext2D, w: WormholeEffect, camera: Camera): void {
  const radius = wormholeRadiusAt(w, w.elapsed)
  renderRift(ctx, w.pos, radius, w.elapsed, camera)
  renderRift(ctx, w.posB, radius, -w.elapsed, camera) // counter-swirl on the far mouth
}

export const wormholeEffect: EffectDefinition = {
  tick: (effect, ctx) => tickWormhole(effect as WormholeEffect, ctx),
  renderBack: (ctx, effect, camera) => renderWormhole(ctx, effect as WormholeEffect, camera),
}
