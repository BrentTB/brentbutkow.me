import { EffectKind } from '../types'
import type { ActiveEffect, CometStormEffect, Vec2 } from '../types'
import type { SpaceMetalAbility } from './space-metal-ability-definition'
import { SpaceMetalAbilityKind } from './space-metal-ability-definition'
import { IconName } from '../../icon-names'
import { uid } from '../entities/entity-creator'
import { createMeteoriteEffect } from '../abilities/meteor-strike'
import { rng } from '../math/random'
import { passThroughTick } from '../systems/effect-definition'
import type {
  EffectDefinition,
  EffectTickContext,
  EffectTickResult,
} from '../systems/effect-definition'

// Comet Storm: a ship-centred emitter that rains meteorite strikes across the
// area around the ship for a few seconds — okay damage, long, very widespread.
// `spreadRadius` approximates the visible screen in world units (engine ticks
// are viewport-agnostic, so there's no live zoom to read). Comets re-centre on
// the ship each wave, so the rain follows the player.
export const COMET_STORM = {
  cost: 3,
  duration: 4,
  spawnInterval: 0.1,
  cometsPerWave: 8,
  spreadRadius: 560,
  cometDamage: 10,
  cometAoeRadius: 40,
  minFallDelay: 0.3,
  maxFallDelay: 0.6,
} as const

export function createCometStormEffect(pos: Vec2): CometStormEffect {
  return {
    id: uid(),
    kind: EffectKind.cometStorm,
    pos: { ...pos },
    elapsed: 0,
    duration: COMET_STORM.duration,
    // 0 ⇒ the first wave drops on the opening tick.
    spawnTimer: 0,
    spawnInterval: COMET_STORM.spawnInterval,
    spreadRadius: COMET_STORM.spreadRadius,
    cometsPerWave: COMET_STORM.cometsPerWave,
    cometDamage: COMET_STORM.cometDamage,
    cometAoeRadius: COMET_STORM.cometAoeRadius,
  }
}

function tickCometStorm(storm: CometStormEffect, ctx: EffectTickContext): EffectTickResult {
  if (storm.elapsed >= storm.duration) {
    // Stop emitting; comets already dropped finish on their own.
    return passThroughTick(null, ctx)
  }

  let spawnTimer = storm.spawnTimer - ctx.dt
  const spawnedEffects: ActiveEffect[] = []
  while (spawnTimer <= 0) {
    for (let i = 0; i < storm.cometsPerWave; i++) {
      const angle = rng.next() * Math.PI * 2
      const dist = Math.sqrt(rng.next()) * storm.spreadRadius
      const pos = {
        x: ctx.ship.pos.x + Math.cos(angle) * dist,
        y: ctx.ship.pos.y + Math.sin(angle) * dist,
      }
      const delay =
        COMET_STORM.minFallDelay +
        rng.next() * (COMET_STORM.maxFallDelay - COMET_STORM.minFallDelay)
      spawnedEffects.push(
        createMeteoriteEffect(pos, storm.cometDamage, storm.cometAoeRadius, delay)
      )
    }
    spawnTimer += storm.spawnInterval
  }

  return {
    effect: { ...storm, spawnTimer },
    enemies: ctx.enemies,
    projectiles: ctx.projectiles,
    particles: [],
    scoreGained: 0,
    killedEnemies: [],
    spawnedEffects,
  }
}

// Tick only — the dropped comets are ordinary meteorite strikes that draw themselves.
export const cometStormEffect: EffectDefinition = {
  tick: (effect, ctx) => tickCometStorm(effect as CometStormEffect, ctx),
}

export const cometStorm: SpaceMetalAbility = {
  kind: SpaceMetalAbilityKind.cometStorm,
  meta: { icon: IconName.cometStorm, label: 'Comet Storm' },
  cost: COMET_STORM.cost,
  hotkey: 'C',
  canActivate: (s) => s.spaceMetal >= COMET_STORM.cost,
  canUse: (ui) => ui.spaceMetal >= COMET_STORM.cost,
  activate: (s) => ({
    ...s,
    spaceMetal: s.spaceMetal - COMET_STORM.cost,
    activeEffects: [...s.activeEffects, createCometStormEffect(s.ship.pos)],
  }),
}
