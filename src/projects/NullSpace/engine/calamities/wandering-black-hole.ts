import { CALAMITY } from '../../data'
import { applyRadialDamage } from './calamity-damage'
import { damageAsteroid } from './asteroids'
import {
  gravityWellBurn,
  gravityWellDisplacement,
  gravityWellImpulse,
} from '../abilities/blackHole/gravity-pull'
import type { GravityWell } from '../abilities/blackHole/gravity-pull'
import { uid } from '../entities/entity-creator'
import { toroidalDistance, wrapPosition } from '../math/toroid'
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
  WanderingBlackHoleEffect,
} from '../types'
import type { Camera } from '../../renderer/camera'
import { worldToScreen } from '../../renderer/camera'
import { passThroughTick } from '../systems/effect-definition'
import type {
  EffectDefinition,
  EffectTickContext,
  EffectTickResult,
} from '../systems/effect-definition'

export function createWanderingBlackHole(pos: Vec2, vel: Vec2): WanderingBlackHoleEffect {
  return {
    id: uid(),
    kind: EffectKind.wanderingBlackHole,
    pos: { ...pos },
    vel: { ...vel },
    elapsed: 0,
    duration: CALAMITY.wellDuration,
    startRadius: CALAMITY.wellStartRadius,
    maxRadius: CALAMITY.wellMaxRadius,
    growDuration: CALAMITY.wellGrowDuration,
    pullStrength: CALAMITY.wellPullStrength,
    damage: CALAMITY.wellDamage,
  }
}

// Live radius: swells from startRadius to maxRadius over growDuration, then holds.
export function wanderingRadiusAt(hole: WanderingBlackHoleEffect, elapsed: number): number {
  const t = hole.growDuration > 0 ? Math.min(1, elapsed / hole.growDuration) : 1
  return hole.startRadius + (hole.maxRadius - hole.startRadius) * t
}

// Lifetime + drift only. The pull + core damage need ship/allies/asteroids, so
// they're applied in the main loop's calamity pass (see applyWanderingHoles).
function tickWanderingBlackHole(
  hole: WanderingBlackHoleEffect,
  ctx: EffectTickContext
): EffectTickResult {
  if (hole.elapsed >= hole.duration) return passThroughTick(null, ctx)
  const drifted: WanderingBlackHoleEffect = {
    ...hole,
    pos: wrapPosition({ x: hole.pos.x + hole.vel.x * ctx.dt, y: hole.pos.y + hole.vel.y * ctx.dt }),
  }
  return passThroughTick(drifted, ctx)
}

function pull<T extends { pos: Vec2 }>(bodies: T[], well: GravityWell, dt: number): T[] {
  return bodies.map((b) => {
    const d = gravityWellDisplacement(b.pos, well, dt)
    if (d.x === 0 && d.y === 0) return b
    return { ...b, pos: wrapPosition({ x: b.pos.x + d.x, y: b.pos.y + d.y }) }
  })
}

export type WanderingHoleResult = {
  ship: Ship
  enemies: Enemy[]
  allies: Ally[]
  asteroids: Asteroid[]
  projectiles: Projectile[]
  killedEnemies: Enemy[]
  killedAsteroids: Asteroid[]
  particles: Particle[]
}

// Each wandering well drags every body toward it and burns the core, scaled to its
// current (growing) radius. Neutral, so: enemy/asteroid kills earn no score and
// asteroids drop no loot. The ship's pull yields to Escape Mode (its damage
// immunity is handled by applyRadialDamage). Killed bodies come back for the caller.
export function applyWanderingHoles(
  effects: ActiveEffect[],
  ship: Ship,
  enemies: Enemy[],
  allies: Ally[],
  asteroids: Asteroid[],
  projectiles: Projectile[],
  dt: number
): WanderingHoleResult {
  let curShip = ship
  let curEnemies = enemies
  let curAllies = allies
  let curAsteroids = asteroids
  let curProjectiles = projectiles
  const killedEnemies: Enemy[] = []
  const particles: Particle[] = []

  for (const e of effects) {
    if (e.kind !== EffectKind.wanderingBlackHole) continue
    const radius = wanderingRadiusAt(e, e.elapsed)
    const well: GravityWell = { pos: e.pos, radius, pullStrength: e.pullStrength, damage: e.damage }

    if (curShip.escapeMode === null) {
      const d = gravityWellDisplacement(curShip.pos, well, dt)
      curShip = {
        ...curShip,
        pos: wrapPosition({ x: curShip.pos.x + d.x, y: curShip.pos.y + d.y }),
      }
    }
    curEnemies = pull(curEnemies, well, dt)
    curAllies = pull(curAllies, well, dt)
    curProjectiles = pull(curProjectiles, well, dt)
    // Asteroids gain momentum (not just a position nudge), so they keep drifting
    // after the well wanders off — flung, not merely shoved while it overlaps.
    curAsteroids = curAsteroids.map((a) => gravityWellImpulse(a, well, dt))

    const blast = applyRadialDamage(
      well.pos,
      0,
      radius,
      (dist) => gravityWellBurn(well.damage, dist, well.radius, dt),
      curShip,
      curEnemies,
      curAllies,
      '#7a55cc'
    )
    curShip = blast.ship
    curEnemies = blast.enemies
    curAllies = blast.allies
    killedEnemies.push(...blast.killedEnemies)
    particles.push(...blast.particles)

    curAsteroids = curAsteroids.map((a) => {
      const dist = toroidalDistance(a.pos, well.pos)
      return dist <= radius
        ? damageAsteroid(a, gravityWellBurn(well.damage, dist, well.radius, dt), false)
        : a
    })
  }

  return {
    ship: curShip,
    enemies: curEnemies,
    allies: curAllies,
    asteroids: curAsteroids.filter((a) => a.hp > 0),
    projectiles: curProjectiles,
    killedEnemies,
    killedAsteroids: curAsteroids.filter((a) => a.hp <= 0),
    particles,
  }
}

function renderWanderingBlackHole(
  ctx: CanvasRenderingContext2D,
  hole: WanderingBlackHoleEffect,
  camera: Camera
): void {
  const s = worldToScreen(hole.pos, camera)
  const radius = wanderingRadiusAt(hole, hole.elapsed)

  ctx.save()
  ctx.translate(s.x, s.y)

  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius)
  gradient.addColorStop(0, 'rgba(18, 6, 36, 0.85)')
  gradient.addColorStop(0.35, 'rgba(50, 24, 96, 0.5)')
  gradient.addColorStop(0.7, 'rgba(90, 56, 170, 0.18)')
  gradient.addColorStop(1, 'rgba(120, 80, 200, 0)')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = 'rgba(150, 110, 220, 0.4)'
  ctx.lineWidth = 1.5
  for (let ring = 0; ring < 3; ring++) {
    const r = radius * (0.3 + ring * 0.22)
    const rot = hole.elapsed * (1.5 + ring) + ring * 2
    ctx.beginPath()
    ctx.arc(0, 0, r, rot, rot + Math.PI * 1.3)
    ctx.stroke()
  }

  ctx.restore()
}

export const wanderingBlackHoleEffect: EffectDefinition = {
  tick: (effect, ctx) => tickWanderingBlackHole(effect as WanderingBlackHoleEffect, ctx),
  renderBack: (ctx, effect, camera) =>
    renderWanderingBlackHole(ctx, effect as WanderingBlackHoleEffect, camera),
}
