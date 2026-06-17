import { EffectKind } from '../types'
import type { ActiveEffect, Enemy, Particle, Projectile, Ship, Vec2 } from '../types'
import type { EffectDefinition } from './effect-definition'
import { meteorStrikeEffect } from '../abilities/meteor-strike'
import { blackHoleEffect } from '../abilities/black-hole'
import { eventHorizonEffect } from '../abilities/event-horizon'
import { rocketEffect } from '../abilities/rocket'
import { shieldEffect } from '../abilities/shield'
import { sunEffect } from '../abilities/sun'
import { supernovaEffect } from '../abilities/supernova'
import { forceFieldEffect } from '../abilities/force-field'
import { nuclearWasteEffect } from '../weapons/nuke'

// Registry: each effect's owner file (ability or ship weapon) declares an
// EffectDefinition — tick + optional world-layer renderers — and registers it
// here, the only central step a new effect needs. updateActiveEffects and the
// renderer both dispatch through this map.
export const EFFECT_DEFINITIONS: Record<EffectKind, EffectDefinition> = {
  // Meteorite and Meteor share one strike behaviour; the effect's kind picks
  // the sprite and tuning.
  [EffectKind.meteoriteStrike]: meteorStrikeEffect,
  [EffectKind.meteorStrike]: meteorStrikeEffect,
  [EffectKind.blackHole]: blackHoleEffect,
  [EffectKind.eventHorizon]: eventHorizonEffect,
  [EffectKind.rocket]: rocketEffect,
  [EffectKind.shield]: shieldEffect,
  [EffectKind.sun]: sunEffect,
  [EffectKind.supernova]: supernovaEffect,
  [EffectKind.forceField]: forceFieldEffect,
  [EffectKind.nuclearWaste]: nuclearWasteEffect,
}

export function updateActiveEffects(
  effects: ActiveEffect[],
  enemies: Enemy[],
  projectiles: Projectile[],
  ship: Ship,
  worldSize: Vec2,
  dt: number
): {
  activeEffects: ActiveEffect[]
  enemies: Enemy[]
  projectiles: Projectile[]
  particles: Particle[]
  scoreGained: number
  killedEnemies: Enemy[]
} {
  const surviving: ActiveEffect[] = []
  const allParticles: Particle[] = []
  const allKilled: Enemy[] = []
  let scoreGained = 0
  let currentEnemies = enemies
  let currentProjectiles = projectiles

  for (const effect of effects) {
    const updated = { ...effect, elapsed: effect.elapsed + dt }
    const result = EFFECT_DEFINITIONS[updated.kind].tick(updated, {
      enemies: currentEnemies,
      projectiles: currentProjectiles,
      ship,
      worldSize,
      dt,
    })

    currentEnemies = result.enemies
    currentProjectiles = result.projectiles
    scoreGained += result.scoreGained
    allKilled.push(...result.killedEnemies)
    allParticles.push(...result.particles)

    if (result.effect) surviving.push(result.effect)
    // Children (e.g. Fireworks rockets) join the pool; they tick next frame.
    if (result.spawnedEffects) surviving.push(...result.spawnedEffects)
  }

  return {
    activeEffects: surviving,
    enemies: currentEnemies,
    projectiles: currentProjectiles,
    particles: allParticles,
    scoreGained,
    killedEnemies: allKilled,
  }
}
