import type { ActiveEffect, Enemy, Particle, Projectile, Ship, Vec2 } from '../types'
import type { Camera } from '../../renderer/camera'
import type { SpriteCache } from '../../renderer/sprite-cache'

export type EffectTickContext = {
  enemies: Enemy[]
  projectiles: Projectile[]
  ship: Ship
  worldSize: Vec2
  dt: number
}

export type EffectTickResult = {
  effect: ActiveEffect | null
  enemies: Enemy[]
  projectiles: Projectile[]
  particles: Particle[]
  scoreGained: number
  killedEnemies: Enemy[]
  // Child effects spawned this tick (e.g. a Fireworks rocket bursting into more
  // rockets). Collected by updateActiveEffects alongside the surviving effect.
  // Absent/empty when the effect spawns nothing.
  spawnedEffects?: ActiveEffect[]
}

type EffectTickFn = (effect: ActiveEffect, ctx: EffectTickContext) => EffectTickResult

type EffectRenderFn = (
  ctx: CanvasRenderingContext2D,
  effect: ActiveEffect,
  camera: Camera,
  sprites: SpriteCache
) => void

// One effect's full behaviour — simulation tick plus world-layer drawing —
// declared in the ability/weapon file that owns it and registered once in
// EFFECT_DEFINITIONS (systems/effects.ts). renderBack draws beneath entities,
// renderFront on top of them.
export type EffectDefinition = {
  tick: EffectTickFn
  renderBack?: EffectRenderFn
  renderFront?: EffectRenderFn
}

// Tick result that changes nothing — for effects still in a waiting phase.
// Pass null as `effect` to expire the effect without side effects.
export function passThroughTick(
  effect: ActiveEffect | null,
  ctx: EffectTickContext
): EffectTickResult {
  return {
    effect,
    enemies: ctx.enemies,
    projectiles: ctx.projectiles,
    particles: [],
    scoreGained: 0,
    killedEnemies: [],
  }
}
