import { RADIATION } from '../ability-data'
import { uid } from '../../entities/entity-creator'
import { AbilityKind, EffectKind } from '../../types'
import type { RadiationFieldEffect, Vec2 } from '../../types'
import type { Camera } from '../../../renderer/camera'
import { worldToScreen } from '../../../renderer/camera'
import {
  makeAbilityUpgrade,
  applyTierSum,
  applyCostReduction,
  type AbilityDefinition,
} from '../ability-definition'
import type {
  EffectDefinition,
  EffectTickContext,
  EffectTickResult,
} from '../../systems/effect-definition'
import { passThroughTick } from '../../systems/effect-definition'
import { IconName } from '../../../icon-names'

export const RADIATION_UPGRADE_IDS = {
  unlockRadiation: 'unlockRadiation',
  radiationDamage: 'radiationDamage',
  radiationDuration: 'radiationDuration',
  radiationRadius: 'radiationRadius',
  radiationCostReduction: 'radiationCostReduction',
} as const

const upgrade = makeAbilityUpgrade(AbilityKind.radiation)

const unlockUpgrade = upgrade({
  id: RADIATION_UPGRADE_IDS.unlockRadiation,
  label: 'Unlock Radiation',
  description:
    'Leave a radioactive pool — enemies inside stack radiation that lingers as they leave',
  tiers: [{ cost: 50, value: 1 }],
})

const damageUpgrade = upgrade({
  id: RADIATION_UPGRADE_IDS.radiationDamage,
  label: 'Damage',
  description: 'Increase damage per radiation stack',
  tiers: [
    { cost: 15, value: 0.5 },
    { cost: 60, value: 0.8 },
    { cost: 200, value: 1.2 },
    { cost: 400, value: 1.8 },
  ],
})

const durationUpgrade = upgrade({
  id: RADIATION_UPGRADE_IDS.radiationDuration,
  label: 'Duration',
  description: 'Increase how long the pool lingers',
  tiers: [
    { cost: 20, value: 1 },
    { cost: 80, value: 2 },
  ],
})

const radiusUpgrade = upgrade({
  id: RADIATION_UPGRADE_IDS.radiationRadius,
  label: 'Range',
  description: 'Increase pool radius',
  tiers: [
    { cost: 15, value: 25 },
    { cost: 60, value: 40 },
    { cost: 200, value: 60 },
  ],
})

const costUpgrade = upgrade({
  id: RADIATION_UPGRADE_IDS.radiationCostReduction,
  label: 'Efficiency',
  description: 'Reduce radiation power cost',
  tiers: [
    { cost: 16, value: 6 },
    { cost: 64, value: 6 },
  ],
})

export function createRadiationFieldEffect(
  pos: Vec2,
  radius: number,
  dpsPerStack: number,
  duration: number,
  maxStacks: number,
  spreadRange: number
): RadiationFieldEffect {
  return {
    id: uid(),
    kind: EffectKind.radiationField,
    pos: { ...pos },
    elapsed: 0,
    duration,
    radius,
    dpsPerStack,
    maxStacks,
    spreadRange,
  }
}

// The pool only ages + renders; the stacking DOT lives on the enemy
// (updateRadiatedEnemies reads every active pool as a zone).
function tickRadiationField(
  effect: RadiationFieldEffect,
  ctx: EffectTickContext
): EffectTickResult {
  return passThroughTick(effect.elapsed >= effect.duration ? null : effect, ctx)
}

function renderRadiationField(
  ctx: CanvasRenderingContext2D,
  effect: RadiationFieldEffect,
  camera: Camera
): void {
  const screen = worldToScreen(effect.pos, camera)
  const fadeIn = Math.min(0.5, effect.duration * 0.15)
  const fadeOut = Math.min(1.0, effect.duration * 0.3)
  const fadeOutStart = effect.duration - fadeOut
  let alpha: number
  if (effect.elapsed < fadeIn) alpha = effect.elapsed / fadeIn
  else if (effect.elapsed > fadeOutStart)
    alpha = Math.max(0, (effect.duration - effect.elapsed) / fadeOut)
  else alpha = 1

  // Slow churn — a radioactive haze, not a pulsing star.
  const pulse = 1 + Math.sin(effect.elapsed * 3) * 0.05
  const r = effect.radius * pulse

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(screen.x, screen.y)
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
  grad.addColorStop(0, 'rgba(150, 240, 60, 0.30)')
  grad.addColorStop(0.6, 'rgba(110, 200, 40, 0.16)')
  grad.addColorStop(1, 'rgba(80, 160, 30, 0)')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

export const radiationFieldEffect: EffectDefinition = {
  tick: (effect, ctx) => tickRadiationField(effect as RadiationFieldEffect, ctx),
  renderBack: (ctx, effect, camera) =>
    renderRadiationField(ctx, effect as RadiationFieldEffect, camera),
}

export const radiation: AbilityDefinition = {
  kind: AbilityKind.radiation,
  meta: { icon: IconName.radiation, label: 'Radiation' },
  activation: 'click',
  base: () => ({
    kind: AbilityKind.radiation,
    cooldown: RADIATION.cooldown,
    powerCost: RADIATION.powerCost,
    damage: RADIATION.dpsPerStack,
    aoeRadius: RADIATION.radius,
    duration: RADIATION.duration,
    spreadRange: 0,
  }),
  effectFactory: (ability, pos) => [
    createRadiationFieldEffect(
      pos,
      ability.aoeRadius,
      ability.damage,
      ability.duration ?? RADIATION.duration,
      RADIATION.maxStacks,
      ability.spreadRange ?? 0
    ),
  ],
  applyUpgrades: (_ability, upgrades) => ({
    unlocked: upgrades[RADIATION_UPGRADE_IDS.unlockRadiation].currentTier > 0,
    damage: applyTierSum(RADIATION.dpsPerStack, upgrades, damageUpgrade),
    duration: applyTierSum(RADIATION.duration, upgrades, durationUpgrade),
    aoeRadius: applyTierSum(RADIATION.radius, upgrades, radiusUpgrade),
    powerCost: applyCostReduction(RADIATION.powerCost, upgrades, costUpgrade),
  }),
  unlockUpgrade,
  modifierUpgrades: [damageUpgrade, durationUpgrade, radiusUpgrade, costUpgrade],
  ultimate: {
    kind: AbilityKind.meltdown,
    label: 'Meltdown',
    description: 'Let it reach critical and the glow spreads on its own.',
    cost: { stardust: 420, spaceMetal: 16 },
  },
}
