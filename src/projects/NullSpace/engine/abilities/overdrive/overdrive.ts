import { OVERDRIVE } from '../ability-data'
import { uid } from '../../entities/entity-creator'
import { AbilityKind, EffectKind } from '../../types'
import type { OverdriveFieldEffect, Vec2 } from '../../types'
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

export const OVERDRIVE_UPGRADE_IDS = {
  unlockOverdrive: 'unlockOverdrive',
  overdriveAmp: 'overdriveAmp',
  overdriveDuration: 'overdriveDuration',
  overdriveRadius: 'overdriveRadius',
  overdriveCostReduction: 'overdriveCostReduction',
} as const

const upgrade = makeAbilityUpgrade(AbilityKind.overdrive)

const unlockUpgrade = upgrade({
  id: OVERDRIVE_UPGRADE_IDS.unlockOverdrive,
  label: 'Unlock Overdrive',
  description:
    'Drop a zone where enemies take more damage, slow, and weaken — and your cooldowns race',
  tiers: [{ cost: 70, value: 1 }],
})

const ampUpgrade = upgrade({
  id: OVERDRIVE_UPGRADE_IDS.overdriveAmp,
  label: 'Amplify',
  description: 'Enemies inside take even more damage',
  // Values add onto the base damage multiplier via applyTierSum.
  tiers: [
    { cost: 30, value: 0.2 },
    { cost: 120, value: 0.3 },
    { cost: 320, value: 0.4 },
  ],
})

const durationUpgrade = upgrade({
  id: OVERDRIVE_UPGRADE_IDS.overdriveDuration,
  label: 'Duration',
  description: 'The field lasts longer',
  tiers: [
    { cost: 25, value: 2 },
    { cost: 90, value: 3 },
  ],
})

const radiusUpgrade = upgrade({
  id: OVERDRIVE_UPGRADE_IDS.overdriveRadius,
  label: 'Range',
  description: 'Increase the field radius',
  tiers: [
    { cost: 20, value: 30 },
    { cost: 80, value: 50 },
  ],
})

const costUpgrade = upgrade({
  id: OVERDRIVE_UPGRADE_IDS.overdriveCostReduction,
  label: 'Efficiency',
  description: 'Reduce overdrive power cost',
  tiers: [
    { cost: 24, value: 11 },
    { cost: 90, value: 12 },
  ],
})

export function createOverdriveFieldEffect(
  pos: Vec2,
  radius: number,
  duration: number,
  ampMult: number,
  slowMult: number,
  enemyDamageMult: number,
  selfHaste: number
): OverdriveFieldEffect {
  return {
    id: uid(),
    kind: EffectKind.overdriveField,
    pos: { ...pos },
    elapsed: 0,
    duration,
    radius,
    ampMult,
    slowMult,
    enemyDamageMult,
    selfHaste,
  }
}

// The field only ages + renders; the per-enemy debuffs + ship haste are applied by
// the overdrive pass in the game loop (it reads every active field as a zone).
function tickOverdrive(effect: OverdriveFieldEffect, ctx: EffectTickContext): EffectTickResult {
  return passThroughTick(effect.elapsed >= effect.duration ? null : effect, ctx)
}

function renderOverdrive(
  ctx: CanvasRenderingContext2D,
  effect: OverdriveFieldEffect,
  camera: Camera
): void {
  const screen = worldToScreen(effect.pos, camera)
  const fadeIn = Math.min(0.4, effect.duration * 0.15)
  const fadeOut = Math.min(1.0, effect.duration * 0.3)
  const fadeOutStart = effect.duration - fadeOut
  let alpha: number
  if (effect.elapsed < fadeIn) alpha = effect.elapsed / fadeIn
  else if (effect.elapsed > fadeOutStart)
    alpha = Math.max(0, (effect.duration - effect.elapsed) / fadeOut)
  else alpha = 1

  ctx.save()
  ctx.translate(screen.x, screen.y)

  // Electric-blue charged dome — reads apart from sun (orange), radiation (green),
  // and the gravity lure (violet).
  const r = effect.radius
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
  grad.addColorStop(0, 'rgba(120, 200, 255, 0.26)')
  grad.addColorStop(0.7, 'rgba(70, 140, 255, 0.12)')
  grad.addColorStop(1, 'rgba(60, 120, 255, 0)')
  ctx.globalAlpha = alpha
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()

  // A sweeping charge arc + crisp rim so the boundary reads clearly.
  ctx.strokeStyle = 'rgba(150, 210, 255, 0.55)'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = 'rgba(220, 240, 255, 0.9)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(0, 0, r, effect.elapsed * 3, effect.elapsed * 3 + Math.PI / 2)
  ctx.stroke()

  ctx.restore()
}

export const overdriveFieldEffect: EffectDefinition = {
  tick: (effect, ctx) => tickOverdrive(effect as OverdriveFieldEffect, ctx),
  renderBack: (ctx, effect, camera) => renderOverdrive(ctx, effect as OverdriveFieldEffect, camera),
}

export const overdrive: AbilityDefinition = {
  kind: AbilityKind.overdrive,
  meta: { icon: IconName.overdrive, label: 'Overdrive' },
  activation: 'click',
  base: () => ({
    kind: AbilityKind.overdrive,
    cooldown: OVERDRIVE.cooldown,
    powerCost: OVERDRIVE.powerCost,
    damage: OVERDRIVE.ampMult,
    aoeRadius: OVERDRIVE.radius,
    duration: OVERDRIVE.duration,
  }),
  effectFactory: (ability, pos) => [
    createOverdriveFieldEffect(
      pos,
      ability.aoeRadius,
      ability.duration ?? OVERDRIVE.duration,
      ability.damage,
      OVERDRIVE.slowMult,
      OVERDRIVE.enemyDamageMult,
      OVERDRIVE.selfHaste
    ),
  ],
  applyUpgrades: (_ability, upgrades) => ({
    unlocked: upgrades[OVERDRIVE_UPGRADE_IDS.unlockOverdrive].currentTier > 0,
    damage: applyTierSum(OVERDRIVE.ampMult, upgrades, ampUpgrade),
    duration: applyTierSum(OVERDRIVE.duration, upgrades, durationUpgrade),
    aoeRadius: applyTierSum(OVERDRIVE.radius, upgrades, radiusUpgrade),
    powerCost: applyCostReduction(OVERDRIVE.powerCost, upgrades, costUpgrade),
  }),
  unlockUpgrade,
  modifierUpgrades: [ampUpgrade, durationUpgrade, radiusUpgrade, costUpgrade],
  ultimate: {
    kind: AbilityKind.overloadCore,
    label: 'Overload Core',
    description: 'Everything caught in the field is at your mercy.',
    cost: { stardust: 460, spaceMetal: 18 },
  },
}
