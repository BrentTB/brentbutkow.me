import { GRAVITY_LURE } from '../ability-data'
import { uid, spawnExplosionParticles } from '../../entities/entity-creator'
import { damageEnemiesInRadiusFlat } from '../../math/aoe'
import { toroidalDistance } from '../../math/toroid'
import { AbilityKind, EffectKind } from '../../types'
import type { GravityLureEffect, Vec2 } from '../../types'
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

export const GRAVITY_LURE_UPGRADE_IDS = {
  unlockGravityLure: 'unlockGravityLure',
  gravityLurePull: 'gravityLurePull',
  gravityLureHealth: 'gravityLureHealth',
  gravityLureCostReduction: 'gravityLureCostReduction',
} as const

const upgrade = makeAbilityUpgrade(AbilityKind.gravityLure)

const unlockUpgrade = upgrade({
  id: GRAVITY_LURE_UPGRADE_IDS.unlockGravityLure,
  label: 'Unlock Gravity Lure',
  description: 'Drop a beacon — nearby enemies chase it instead of your ship',
  tiers: [{ cost: 40, value: 1 }],
})

const pullUpgrade = upgrade({
  id: GRAVITY_LURE_UPGRADE_IDS.gravityLurePull,
  label: 'Pull',
  description: 'Increase the beacon lure radius',
  tiers: [
    { cost: 20, value: 40 },
    { cost: 80, value: 60 },
  ],
})

const healthUpgrade = upgrade({
  id: GRAVITY_LURE_UPGRADE_IDS.gravityLureHealth,
  label: 'Durability',
  description: 'The beacon takes more punishment before it falls',
  tiers: [
    { cost: 25, value: 60 },
    { cost: 90, value: 120 },
  ],
})

const costUpgrade = upgrade({
  id: GRAVITY_LURE_UPGRADE_IDS.gravityLureCostReduction,
  label: 'Efficiency',
  description: 'Reduce gravity lure power cost',
  tiers: [
    { cost: 14, value: 4 },
    { cost: 55, value: 5 },
  ],
})

export function createGravityLureEffect(
  pos: Vec2,
  lureRadius: number,
  hp: number,
  detonate?: { damage: number; radius: number }
): GravityLureEffect {
  return {
    id: uid(),
    kind: EffectKind.gravityLure,
    pos: { ...pos },
    elapsed: 0,
    // Nominal un-attacked lifetime (HP ÷ decay). The beacon dies by HP, not this —
    // kept only to satisfy the shared effect shape.
    duration: hp / GRAVITY_LURE.hpDecayPerSec,
    lureRadius,
    hp,
    maxHp: hp,
    ...(detonate ? { detonate } : {}),
  }
}

// The taunt (enemies steering to it) runs in the enemy AI pass. Here the beacon
// loses HP to a steady self-decay (like a helper) plus every enemy engaging it —
// they tear it down. It dies only at 0 HP (never a hidden timer); a Collapsar
// detonates on the crowd it gathered, a base beacon just pops.
function tickGravityLure(effect: GravityLureEffect, ctx: EffectTickContext): EffectTickResult {
  let drain = GRAVITY_LURE.hpDecayPerSec * ctx.dt
  for (const e of ctx.enemies) {
    if (e.boss) continue
    const engage = e.radius + GRAVITY_LURE.contactRadius
    if (toroidalDistance(e.pos, effect.pos) <= engage) drain += e.damage * ctx.dt
  }
  const hp = effect.hp - drain

  if (hp > 0) return passThroughTick({ ...effect, hp }, ctx)

  if (!effect.detonate) {
    return {
      effect: null,
      enemies: ctx.enemies,
      projectiles: ctx.projectiles,
      particles: spawnExplosionParticles(effect.pos, 10, '#b07cff'),
      scoreGained: 0,
      killedEnemies: [],
    }
  }
  const { damage, radius } = effect.detonate
  const blast = damageEnemiesInRadiusFlat(ctx.enemies, effect.pos, radius, damage)
  return {
    effect: null,
    enemies: blast.enemies,
    projectiles: ctx.projectiles,
    particles: spawnExplosionParticles(effect.pos, 24, '#b07cff'),
    scoreGained: blast.scoreGained,
    killedEnemies: blast.killedEnemies,
  }
}

function renderGravityLure(
  ctx: CanvasRenderingContext2D,
  effect: GravityLureEffect,
  camera: Camera
): void {
  const screen = worldToScreen(effect.pos, camera)
  // Quick fade-in; the beacon's exit is its HP hitting 0 (it pops), not a timer.
  const alpha = Math.min(1, effect.elapsed / 0.3)

  const t = effect.elapsed
  ctx.save()
  ctx.translate(screen.x, screen.y)

  // Motes streaming inward — reads as a gravity well pulling things to the core.
  const motes = 4
  for (let i = 0; i < motes; i++) {
    const ph = (t * 0.7 + i / motes) % 1 // 0 (outer) → 1 (core)
    const mr = 44 * (1 - ph)
    const ang = i * ((Math.PI * 2) / motes) + t * 0.6
    ctx.globalAlpha = alpha * (0.2 + 0.8 * ph)
    ctx.fillStyle = '#d8c2ff'
    ctx.beginPath()
    ctx.arc(Math.cos(ang) * mr, Math.sin(ang) * mr, 2.5, 0, Math.PI * 2)
    ctx.fill()
  }

  // Bright pulsing core — the beacon body.
  const pulse = 1 + Math.sin(t * 5) * 0.15
  const cr = 13 * pulse
  ctx.globalAlpha = alpha
  const core = ctx.createRadialGradient(0, 0, 0, 0, 0, cr)
  core.addColorStop(0, 'rgba(245, 235, 255, 1)')
  core.addColorStop(0.5, 'rgba(176, 124, 255, 0.85)')
  core.addColorStop(1, 'rgba(130, 80, 230, 0)')
  ctx.fillStyle = core
  ctx.beginPath()
  ctx.arc(0, 0, cr, 0, Math.PI * 2)
  ctx.fill()

  // HP arc — shrinks as enemies tear the beacon down.
  const frac = effect.maxHp > 0 ? Math.max(0, effect.hp / effect.maxHp) : 0
  if (frac > 0) {
    ctx.globalAlpha = alpha * 0.85
    ctx.strokeStyle = 'rgba(205, 180, 255, 0.9)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(0, 0, 38, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()
}

export const gravityLureEffect: EffectDefinition = {
  tick: (effect, ctx) => tickGravityLure(effect as GravityLureEffect, ctx),
  renderBack: (ctx, effect, camera) => renderGravityLure(ctx, effect as GravityLureEffect, camera),
}

export const gravityLure: AbilityDefinition = {
  kind: AbilityKind.gravityLure,
  meta: { icon: IconName.gravityLure, label: 'Gravity Lure' },
  activation: 'click',
  base: () => ({
    kind: AbilityKind.gravityLure,
    cooldown: GRAVITY_LURE.cooldown,
    powerCost: GRAVITY_LURE.powerCost,
    damage: 0,
    aoeRadius: GRAVITY_LURE.lureRadius,
    maxHp: GRAVITY_LURE.hp,
  }),
  effectFactory: (ability, pos) => [
    createGravityLureEffect(pos, ability.aoeRadius, ability.maxHp ?? GRAVITY_LURE.hp),
  ],
  applyUpgrades: (_ability, upgrades) => ({
    unlocked: upgrades[GRAVITY_LURE_UPGRADE_IDS.unlockGravityLure].currentTier > 0,
    aoeRadius: applyTierSum(GRAVITY_LURE.lureRadius, upgrades, pullUpgrade),
    maxHp: applyTierSum(GRAVITY_LURE.hp, upgrades, healthUpgrade),
    powerCost: applyCostReduction(GRAVITY_LURE.powerCost, upgrades, costUpgrade),
  }),
  unlockUpgrade,
  modifierUpgrades: [pullUpgrade, healthUpgrade, costUpgrade],
  ultimate: {
    kind: AbilityKind.collapsar,
    label: 'Collapsar',
    description: 'Gather them close — then collapse the point.',
    cost: { stardust: 360, spaceMetal: 14 },
  },
}
