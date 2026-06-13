import { SINGULARITY, TELEKINESIS } from './ability-data'
import { canEnemyTakeDamage } from '../bosses/index'
import { distance } from '../math/collision'
import { spawnExplosionParticles } from '../entities/entity-creator'
import { damageEnemiesInRadiusFlat } from '../math/aoe'
import { applyRadialForce, RadialForceMode } from './radial-force'
import { drawForceField } from './force-field-render'
import { AbilityKind } from '../types'
import type { Enemy } from '../types'
import { worldToScreen } from '../../renderer/camera'
import {
  makeAbilityUpgrade,
  applyTierSum,
  composeUltimateUpgrades,
  type AbilityDefinition,
} from './ability-definition'
import { telekinesis } from './telekinesis'
import { IconName } from '../../icon-names'
import type { HoldAbilityConfig } from './hold-runtime'

export const SINGULARITY_UPGRADE_IDS = {
  singularityCollapse: 'singularityCollapse',
} as const

const upgrade = makeAbilityUpgrade(AbilityKind.singularity)

const collapseUpgrade = upgrade({
  id: SINGULARITY_UPGRADE_IDS.singularityCollapse,
  label: 'Collapse',
  description: 'The release detonation hits harder',
  // Values add onto the base explosion damage via applyTierSum.
  tiers: [
    { cost: 80, value: 50 },
    { cost: 220, value: 80 },
    { cost: 500, value: 120 },
  ],
})

const singularityHold: HoldAbilityConfig = {
  armSeconds: TELEKINESIS.armSeconds,
  // Continuous: pull enemies inward, then crush whatever clusters in the core.
  onFrame: (bag, ability, holdPos, dt) => {
    const radius = ability.aoeRadius
    let enemies = applyRadialForce(
      bag.enemies,
      holdPos,
      radius,
      ability.force ?? TELEKINESIS.force,
      RadialForceMode.pull,
      dt
    )

    // Crushing damage scales with the crowd: 1 enemy in the core takes none, the
    // rest take (count − 1) × perEnemyDps each per second.
    const coreRadius = radius * SINGULARITY.coreRadiusFraction
    const inCore = new Set(
      enemies
        .filter((e) => distance(holdPos, e.pos) <= coreRadius && canEnemyTakeDamage(e, enemies))
        .map((e) => e.id)
    )
    const dps = Math.max(0, inCore.size - 1) * SINGULARITY.perEnemyDps
    let particles = bag.particles
    const killedEnemies = [...bag.killedEnemies]
    if (dps > 0) {
      const damage = dps * dt
      const next: Enemy[] = []
      for (const e of enemies) {
        if (!inCore.has(e.id)) {
          next.push(e)
          continue
        }
        const hp = e.hp - damage
        if (hp <= 0) {
          killedEnemies.push(e)
          particles = [...particles, ...spawnExplosionParticles(e.pos, 6, '#b070ff')]
        } else {
          next.push({ ...e, hp })
        }
      }
      enemies = next
    }
    return { ...bag, enemies, particles, killedEnemies }
  },
  // Letting go detonates the compressed cluster — a flat AoE burst that charges
  // with hold time: linear from 0 to full over maxChargeSeconds, so a quick tap
  // barely pops while a sustained hold pays off.
  onRelease: (bag, ability, releasePos, heldSeconds) => {
    const charge = Math.min(1, heldSeconds / SINGULARITY.maxChargeSeconds)
    const damage = (ability.explosionDamage ?? SINGULARITY.baseExplosionDamage) * charge
    if (damage <= 0) return bag
    const { enemies, killedEnemies } = damageEnemiesInRadiusFlat(
      bag.enemies,
      releasePos,
      ability.aoeRadius,
      damage
    )
    // Burst size mirrors the charge so the explosion reads as bigger when fuller.
    const burst = Math.round(10 + 30 * charge)
    return {
      ...bag,
      enemies,
      particles: [...bag.particles, ...spawnExplosionParticles(releasePos, burst, '#c090ff')],
      killedEnemies: [...bag.killedEnemies, ...killedEnemies],
    }
  },
  // Violet field that converges inward — lines drawn from the edge toward the
  // core sell the pull (vs Telekinesis's outward push ring). The core darkens
  // and deepens toward purple as the release charges — a subtle tell that the
  // blast is building, fully dark = max damage.
  renderFront: (ctx, ability, target, state, camera) => {
    const center = worldToScreen(target, camera)
    const radius = ability.aoeRadius
    // timer accumulates active hold seconds (see hold-runtime); the same value
    // that charges the release blast, so the core tint tracks the damage.
    const held = state.holdStates[AbilityKind.singularity]?.timer ?? 0
    const charge = Math.min(1, held / SINGULARITY.maxChargeSeconds)

    ctx.save()
    drawForceField(ctx, center, radius, state.enemies, camera, {
      ring: 'rgba(180, 120, 255, 0.5)',
      lineRgb: '190, 130, 255',
    })

    // Core — light lavender when uncharged, deepening to a dark purple as the
    // blast charges (the only charge tell).
    const coreR = radius * 0.3
    const r = Math.round(230 - 170 * charge)
    const g = Math.round(210 - 195 * charge)
    const b = Math.round(255 - 150 * charge)
    const core = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, coreR)
    core.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.85)`)
    core.addColorStop(1, 'rgba(160, 100, 255, 0)')
    ctx.fillStyle = core
    ctx.beginPath()
    ctx.arc(center.x, center.y, coreR, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  },
}

export const singularity: AbilityDefinition = {
  kind: AbilityKind.singularity,
  ultimateOf: AbilityKind.telekinesis,
  meta: { icon: IconName.telekinesis, label: 'Singularity' },
  activation: 'hold',
  base: () => ({
    kind: AbilityKind.singularity,
    cooldown: 0,
    powerCost: TELEKINESIS.powerPerSec * SINGULARITY.costMultiplier,
    damage: 0,
    aoeRadius: TELEKINESIS.radius,
    force: TELEKINESIS.force,
    explosionDamage: SINGULARITY.baseExplosionDamage,
  }),
  applyUpgrades: composeUltimateUpgrades(telekinesis, (basePatch, upgrades) => ({
    powerCost: (basePatch.powerCost ?? TELEKINESIS.powerPerSec) * SINGULARITY.costMultiplier,
    explosionDamage: applyTierSum(SINGULARITY.baseExplosionDamage, upgrades, collapseUpgrade),
  })),
  modifierUpgrades: [collapseUpgrade],
  hold: singularityHold,
}
