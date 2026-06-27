import { FORCE_FIELD, SHIELD } from '../ability-data'
import { uid } from '../../entities/entity-creator'
import { AbilityKind, EffectKind } from '../../types'
import type { ForceFieldEffect, Vec2 } from '../../types'
import type { Camera } from '../../../renderer/camera'
import { renderDome } from './dome-render'
import type { DomeStyle } from './dome-render'
import {
  makeAbilityUpgrade,
  applyTierSum,
  composeUltimateUpgrades,
  type AbilityDefinition,
  AbilityActivation,
} from '../ability-definition'
import { shield } from './shield'
import { tickDomeAbsorption } from './dome-absorption'
import type {
  EffectDefinition,
  EffectTickContext,
  EffectTickResult,
} from '../../systems/effect-definition'
import { passThroughTick } from '../../systems/effect-definition'
import { IconName } from '../../../icon-names'

export const FORCE_FIELD_UPGRADE_IDS = {
  forceFieldKnockback: 'forceFieldKnockback',
} as const

const upgrade = makeAbilityUpgrade(AbilityKind.forceField)

const repulsorUpgrade = upgrade({
  id: FORCE_FIELD_UPGRADE_IDS.forceFieldKnockback,
  label: 'Repulsor',
  description: 'Force field hurls enemies away harder',
  // Values add onto the base knockback (FORCE_FIELD.knockback 600) via applyTierSum.
  tiers: [
    { cost: 70, value: 250 },
    { cost: 200, value: 300 },
    { cost: 460, value: 350 },
  ],
})

export function createForceFieldEffect(
  pos: Vec2,
  startRadius: number,
  growDuration: number,
  bumpDamage: number,
  knockback: number
): ForceFieldEffect {
  return {
    id: uid(),
    kind: EffectKind.forceField,
    pos: { ...pos },
    elapsed: 0,
    duration: growDuration,
    radius: startRadius,
    startRadius,
    maxRadius: startRadius * FORCE_FIELD.maxRadiusScale,
    growDuration,
    knockback,
    bumpDamage,
    grandfatheredEnemyIds: null,
  }
}

// Live radius of a force field at `field.elapsed`: grows linearly from
// startRadius to maxRadius (2×) over growDuration. Stored back onto the effect
// each tick so applyShieldConstraints reads the same size the renderer draws.
export function getForceFieldCurrentRadius(field: ForceFieldEffect): number {
  if (field.elapsed <= 0) return field.startRadius
  const t = field.growDuration > 0 ? Math.min(1, field.elapsed / field.growDuration) : 1
  return field.startRadius + (field.maxRadius - field.startRadius) * t
}

function tickForceField(field: ForceFieldEffect, ctx: EffectTickContext): EffectTickResult {
  if (field.elapsed >= field.duration) {
    return passThroughTick(null, ctx)
  }
  // Live radius grows over the field's life; stored back onto the effect so
  // applyShieldConstraints reads the same size the renderer draws.
  return tickDomeAbsorption(field, ctx, getForceFieldCurrentRadius(field), '#c8a8ff')
}

// Violet dome — distinct from the cool-blue base shield.
const FORCE_FIELD_DOME_STYLE: DomeStyle = {
  fadeIn: { cap: 0.3, frac: 0.1 },
  fadeOut: { cap: 0.6, frac: 0.25 },
  pulseFreq: 6,
  fillStops: [
    [0, 'rgba(190, 150, 255, 0.05)'],
    [0.6, 'rgba(180, 120, 255, 0.12)'],
    [1, 'rgba(150, 90, 255, 0.3)'],
  ],
  rim: { color: '200, 160, 255', alpha: 0.7, width: 2.5 },
}

function renderForceField(
  ctx: CanvasRenderingContext2D,
  field: ForceFieldEffect,
  camera: Camera
): void {
  renderDome(ctx, field, camera, FORCE_FIELD_DOME_STYLE)
}

export const forceFieldEffect: EffectDefinition = {
  tick: (effect, ctx) => tickForceField(effect as ForceFieldEffect, ctx),
  renderBack: (ctx, effect, camera) => renderForceField(ctx, effect as ForceFieldEffect, camera),
}

export const forceField: AbilityDefinition = {
  kind: AbilityKind.forceField,
  ultimateOf: AbilityKind.shield,
  meta: { icon: IconName.shield, label: 'Force Field' },
  activation: AbilityActivation.click,
  base: () => ({
    kind: AbilityKind.forceField,
    cooldown: SHIELD.cooldown,
    powerCost: SHIELD.powerCost * FORCE_FIELD.costMultiplier,
    // Flat contact burn; `force` carries the (upgradable) knockback.
    damage: FORCE_FIELD.bumpDamage,
    aoeRadius: SHIELD.radius,
    duration: FORCE_FIELD.growDuration,
    force: FORCE_FIELD.knockback,
  }),
  effectFactory: (ability, pos) => [
    createForceFieldEffect(
      pos,
      ability.aoeRadius,
      ability.duration ?? FORCE_FIELD.growDuration,
      ability.damage,
      ability.force ?? FORCE_FIELD.knockback
    ),
  ],
  applyUpgrades: composeUltimateUpgrades(shield, (basePatch, upgrades) => ({
    powerCost: (basePatch.powerCost ?? SHIELD.powerCost) * FORCE_FIELD.costMultiplier,
    force: applyTierSum(FORCE_FIELD.knockback, upgrades, repulsorUpgrade),
  })),
  modifierUpgrades: [repulsorUpgrade],
}
